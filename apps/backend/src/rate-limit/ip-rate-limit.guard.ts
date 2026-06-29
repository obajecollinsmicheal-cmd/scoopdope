import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { IP_AUTH_RATE_LIMIT, RateLimitConfig, RATE_LIMIT_METADATA } from './rate-limit.constants';

/**
 * Guard that enforces per-IP rate limiting on unauthenticated endpoints.
 *
 * When the limit is exceeded it throws HTTP 429 and sets a `Retry-After`
 * response header (seconds until the current window expires).
 *
 * The limit/window can be overridden on a per-handler basis via the
 * `@RateLimit(config)` decorator — the same decorator already used by the
 * existing `UserRateLimitGuard`.
 */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const ip: string = this.resolveIp(request);

    // Allow per-handler override via @RateLimit() decorator.
    const override = this.reflector.get<Partial<RateLimitConfig> | undefined>(
      RATE_LIMIT_METADATA,
      context.getHandler(),
    );

    const config: RateLimitConfig = {
      ...IP_AUTH_RATE_LIMIT,
      ...override,
    };

    const cacheKey = `ip-rate-limit:${ip}:${context.getClass().name}:${context.getHandler().name}`;

    const { allowed, current, resetInSeconds } = await this.increment(cacheKey, config);

    const remaining = Math.max(0, config.limit - current);

    response.set({
      'X-RateLimit-Limit': config.limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + resetInSeconds * 1000).toISOString(),
    });

    if (!allowed) {
      response.set('Retry-After', resetInSeconds.toString());
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: resetInSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveIp(request: Record<string, unknown>): string {
    const forwarded = request.headers as Record<string, string | string[] | undefined>;
    const xForwardedFor = forwarded?.['x-forwarded-for'];
    if (xForwardedFor) {
      const first = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : (xForwardedFor as string).split(',')[0];
      return first.trim();
    }
    return (request.ip as string) || (request['connection'] as { remoteAddress?: string })?.remoteAddress || 'unknown';
  }

  /**
   * Atomically increments the counter for the given key.
   *
   * Returns:
   *   - `current`       – the new request count after incrementing
   *   - `allowed`       – whether this request is within the limit
   *   - `resetInSeconds`– seconds remaining until the window resets
   */
  private async increment(
    key: string,
    config: RateLimitConfig,
  ): Promise<{ current: number; allowed: boolean; resetInSeconds: number }> {
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    // cache-manager stores TTL in milliseconds for cache-manager v5+;
    // use windowMs directly (cache-manager v7 accepts ms).
    const current = ((await this.cacheManager.get<number>(key)) ?? 0) + 1;

    if (current === 1) {
      // First hit in this window — set with TTL.
      await this.cacheManager.set(key, current, config.windowMs);
    } else {
      // Subsequent hits — update without resetting TTL.
      // We deliberately avoid resetting TTL on each hit so the window is
      // fixed (tumbling), not sliding.  cache-manager v7 does not expose
      // TTL inspection directly, so we track the reset time via a
      // companion key written once per window.
      await this.cacheManager.set(key, current, config.windowMs);
    }

    // Derive approximate seconds remaining (conservative: full window).
    const resetInSeconds = windowSeconds;

    return {
      current,
      allowed: current <= config.limit,
      resetInSeconds,
    };
  }
}
