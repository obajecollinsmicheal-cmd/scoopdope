/**
 * Integration tests for per-IP rate limiting on unauthenticated auth endpoints.
 *
 * These tests spin up a minimal NestJS application that wires up only the
 * IpRateLimitGuard (backed by an in-memory Cache) and two stub endpoints
 * that mirror POST /auth/login and POST /auth/register.
 *
 * Assertions:
 *  - Requests 1..limit are accepted (2xx)
 *  - Request limit+1 returns 429 Too Many Requests
 *  - The 429 response includes a Retry-After header
 *  - The 429 response body contains retryAfter and statusCode fields
 *  - Requests from a *different* IP are NOT blocked by the first IP's counter
 */

import { Controller, HttpCode, Module, Post } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

import { IpRateLimitGuard } from './ip-rate-limit.guard';
import { IP_AUTH_RATE_LIMIT } from './rate-limit.constants';

// ---------------------------------------------------------------------------
// Minimal stub controller — mirrors the two guarded auth endpoints
// ---------------------------------------------------------------------------

@Controller('auth')
class StubAuthController {
  @Post('login')
  @UseGuards(IpRateLimitGuard)
  @HttpCode(200)
  login() {
    return { ok: true };
  }

  @Post('register')
  @UseGuards(IpRateLimitGuard)
  @HttpCode(201)
  register() {
    return { ok: true };
  }
}

@Module({
  imports: [
    // In-memory cache — no Redis required in tests
    CacheModule.register({ ttl: 60000, isGlobal: true }),
  ],
  controllers: [StubAuthController],
  providers: [IpRateLimitGuard, Reflector],
})
class TestAppModule {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Send `count` POST requests to `path` from the given `ip` and return all
 * supertest responses.
 */
async function sendRequests(
  app: INestApplication,
  path: string,
  count: number,
  ip: string,
): Promise<request.Response[]> {
  const responses: request.Response[] = [];
  for (let i = 0; i < count; i++) {
    const res = await request(app.getHttpServer())
      .post(path)
      .set('X-Forwarded-For', ip);
    responses.push(res);
  }
  return responses;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IpRateLimitGuard — integration', () => {
  let app: INestApplication;
  const LIMIT = IP_AUTH_RATE_LIMIT.limit; // 10

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // /auth/login
  // -------------------------------------------------------------------------

  describe('POST /auth/login', () => {
    it(`allows the first ${LIMIT} requests from the same IP`, async () => {
      const responses = await sendRequests(app, '/auth/login', LIMIT, '10.0.0.1');
      for (const res of responses) {
        expect(res.status).toBe(200);
      }
    });

    it('returns 429 on the request after the limit is exceeded', async () => {
      // Exhaust the limit
      await sendRequests(app, '/auth/login', LIMIT, '10.0.0.2');

      // This one should be blocked
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', '10.0.0.2');

      expect(res.status).toBe(429);
    });

    it('includes a Retry-After header in the 429 response', async () => {
      await sendRequests(app, '/auth/login', LIMIT, '10.0.0.3');

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', '10.0.0.3');

      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
      // Should be a positive integer (seconds)
      const retryAfter = parseInt(res.headers['retry-after'], 10);
      expect(retryAfter).toBeGreaterThan(0);
    });

    it('includes retryAfter and statusCode in the 429 response body', async () => {
      await sendRequests(app, '/auth/login', LIMIT, '10.0.0.4');

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', '10.0.0.4');

      expect(res.status).toBe(429);
      expect(res.body.statusCode).toBe(429);
      expect(res.body.retryAfter).toBeGreaterThan(0);
    });

    it('does NOT block requests from a different IP', async () => {
      // Exhaust limit for IP A
      await sendRequests(app, '/auth/login', LIMIT, '10.0.0.5');

      // IP B should still be allowed
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', '10.0.0.99');

      expect(res.status).toBe(200);
    });

    it('sets X-RateLimit-Remaining header that decrements with each request', async () => {
      const responses = await sendRequests(app, '/auth/login', 3, '10.0.0.6');

      const remainingValues = responses.map((r) =>
        parseInt(r.headers['x-ratelimit-remaining'], 10),
      );

      // Should be decreasing: [9, 8, 7] (LIMIT-1, LIMIT-2, LIMIT-3)
      expect(remainingValues[0]).toBe(LIMIT - 1);
      expect(remainingValues[1]).toBe(LIMIT - 2);
      expect(remainingValues[2]).toBe(LIMIT - 3);
    });

    it('sets X-RateLimit-Limit header equal to the configured limit', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', '10.0.0.7');

      expect(res.status).toBe(200);
      expect(parseInt(res.headers['x-ratelimit-limit'], 10)).toBe(LIMIT);
    });
  });

  // -------------------------------------------------------------------------
  // /auth/register
  // -------------------------------------------------------------------------

  describe('POST /auth/register', () => {
    it(`allows the first ${LIMIT} requests from the same IP`, async () => {
      const responses = await sendRequests(app, '/auth/register', LIMIT, '20.0.0.1');
      for (const res of responses) {
        expect(res.status).toBe(201);
      }
    });

    it('returns 429 on the request after the limit is exceeded', async () => {
      await sendRequests(app, '/auth/register', LIMIT, '20.0.0.2');

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', '20.0.0.2');

      expect(res.status).toBe(429);
    });

    it('includes a Retry-After header in the 429 response', async () => {
      await sendRequests(app, '/auth/register', LIMIT, '20.0.0.3');

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', '20.0.0.3');

      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
      const retryAfter = parseInt(res.headers['retry-after'], 10);
      expect(retryAfter).toBeGreaterThan(0);
    });

    it('does NOT block a different IP when one IP is rate-limited', async () => {
      await sendRequests(app, '/auth/register', LIMIT, '20.0.0.4');

      // Different IP should pass
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', '20.0.0.99');

      expect(res.status).toBe(201);
    });
  });

  // -------------------------------------------------------------------------
  // Login and register have independent counters
  // -------------------------------------------------------------------------

  describe('counter isolation between endpoints', () => {
    it('exhausting /login does not affect /register counter for the same IP', async () => {
      const ip = '30.0.0.1';
      // Exhaust login limit
      await sendRequests(app, '/auth/login', LIMIT, ip);

      // Login should now be blocked
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', ip);
      expect(loginRes.status).toBe(429);

      // Register should still be allowed (different cache key)
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', ip);
      expect(registerRes.status).toBe(201);
    });
  });
});
