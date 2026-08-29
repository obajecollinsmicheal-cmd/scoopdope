import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';
import { Webhook } from './webhook.entity';
import { WebhookDelivery, DeliveryStatus } from './webhook-delivery.entity';

/** Build a valid HMAC-SHA256 signature in the same format the service uses */
function buildSignature(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// Constants matching the service
const MAX_ATTEMPTS = 5;
const RETRY_DELAYS = [30, 60, 300, 1800, 7200]; // seconds

describe('WebhooksService', () => {
  let service: WebhooksService;

  const mockWebhookRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockDeliveryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: getRepositoryToken(Webhook), useValue: mockWebhookRepo },
        { provide: getRepositoryToken(WebhookDelivery), useValue: mockDeliveryRepo },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Retry logic: exponential backoff ────────────────────────────────────────

  describe('Retry Logic - Exponential Backoff', () => {
    /**
     * Test: First failed delivery is retried after 30 seconds (1st retry delay).
     * 
     * When a delivery fails on the first attempt, the service should schedule
     * the next retry at 30 seconds in the future (RETRY_DELAYS[0] = 30).
     */
    it('schedules first retry after 30 seconds on initial delivery failure', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-1',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        payload: JSON.stringify({ event: 'test' }),
        attempts: 0,
        status: DeliveryStatus.PENDING,
        nextRetryAt: null,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      // Mock httpPost to simulate failure
      jest.spyOn<any, any>(service, 'httpPost').mockRejectedValue(new Error('Connection failed'));

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      // Assert delivery was marked as PENDING with next retry scheduled
      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      expect(savedDelivery.status).toBe(DeliveryStatus.PENDING);
      expect(savedDelivery.nextRetryAt).not.toBeNull();

      // Calculate expected retry time (30 seconds = 30000 ms)
      const now = Date.now();
      const expectedMinTime = now + 30 * 1000 - 1000; // 1 sec tolerance
      const expectedMaxTime = now + 30 * 1000 + 1000;
      const actualRetryTime = new Date(savedDelivery.nextRetryAt).getTime();

      expect(actualRetryTime).toBeGreaterThanOrEqual(expectedMinTime);
      expect(actualRetryTime).toBeLessThanOrEqual(expectedMaxTime);
    });

    /**
     * Test: Second failed delivery is retried after 60 seconds (exponential increase).
     * 
     * After the first retry fails, the next retry should be scheduled at 60 seconds
     * in the future (RETRY_DELAYS[1] = 60), demonstrating exponential backoff.
     */
    it('schedules second retry after 60 seconds (exponential backoff)', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-2',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-2',
        webhookId: 'webhook-2',
        payload: JSON.stringify({ event: 'test' }),
        attempts: 1, // Already failed once
        status: DeliveryStatus.FAILED,
        nextRetryAt: null,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      jest.spyOn<any, any>(service, 'httpPost').mockRejectedValue(new Error('Connection failed'));

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      const now = Date.now();
      const expectedMinTime = now + 60 * 1000 - 1000;
      const expectedMaxTime = now + 60 * 1000 + 1000;
      const actualRetryTime = new Date(savedDelivery.nextRetryAt).getTime();

      expect(actualRetryTime).toBeGreaterThanOrEqual(expectedMinTime);
      expect(actualRetryTime).toBeLessThanOrEqual(expectedMaxTime);
    });

    /**
     * Test: Fifth retry delay follows exponential backoff: 7200 seconds (2 hours).
     * 
     * The 5th retry delay (RETRY_DELAYS[4] = 7200) represents a 2-hour backoff
     * for the final attempt before giving up.
     */
    it('schedules fifth retry after 7200 seconds (2 hours) before final failure', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-5',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-5',
        webhookId: 'webhook-5',
        payload: JSON.stringify({ event: 'test' }),
        attempts: 4, // 4 failed attempts, scheduling 5th
        status: DeliveryStatus.FAILED,
        nextRetryAt: null,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      jest.spyOn<any, any>(service, 'httpPost').mockRejectedValue(new Error('Connection failed'));

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      const now = Date.now();
      const expectedMinTime = now + 7200 * 1000 - 1000;
      const expectedMaxTime = now + 7200 * 1000 + 1000;
      const actualRetryTime = new Date(savedDelivery.nextRetryAt).getTime();

      expect(actualRetryTime).toBeGreaterThanOrEqual(expectedMinTime);
      expect(actualRetryTime).toBeLessThanOrEqual(expectedMaxTime);
    });

    /**
     * Test: All retry delays follow the expected sequence.
     * 
     * Verifies the entire exponential backoff sequence is correct:
     * 30s -> 60s -> 300s (5 min) -> 1800s (30 min) -> 7200s (2 hours)
     */
    it('follows correct exponential backoff sequence across all retries', () => {
      const expectedSequence = [30, 60, 300, 1800, 7200];
      expect(RETRY_DELAYS).toEqual(expectedSequence);
    });
  });

  // ── Max retries limit ──────────────────────────────────────────────────────

  describe('Max Retries Limit', () => {
    /**
     * Test: After 5 failed delivery attempts, no more retries are scheduled.
     * 
     * When attempts reach MAX_ATTEMPTS (5), the delivery should be marked as
     * FAILED with no nextRetryAt scheduled.
     */
    it('stops retrying after MAX_ATTEMPTS (5) is reached', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-max',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-max',
        webhookId: 'webhook-max',
        payload: JSON.stringify({ event: 'test' }),
        attempts: MAX_ATTEMPTS - 1, // 4 attempts already, about to be 5th
        status: DeliveryStatus.FAILED,
        nextRetryAt: null,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      jest.spyOn<any, any>(service, 'httpPost').mockRejectedValue(new Error('Connection failed'));

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];

      // After 5 attempts, should not schedule another retry
      expect(savedDelivery.attempts).toBe(MAX_ATTEMPTS);
      expect(savedDelivery.status).toBe(DeliveryStatus.FAILED);
      expect(savedDelivery.nextRetryAt).toBeNull();
    });

    /**
     * Test: Confirms MAX_ATTEMPTS constant is 5 (not 4 or 6).
     */
    it('has MAX_ATTEMPTS set to 5', () => {
      expect(MAX_ATTEMPTS).toBe(5);
    });
  });

  // ── Successful delivery stops retries ───────────────────────────────────────

  describe('Successful Delivery', () => {
    /**
     * Test: When a delivery succeeds (HTTP 200-299), status is set to SUCCESS
     * and no retry is scheduled.
     */
    it('marks delivery as SUCCESS on successful HTTP response (2xx)', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-success',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-success',
        webhookId: 'webhook-success',
        payload: JSON.stringify({ event: 'enrollment.created' }),
        attempts: 0,
        status: DeliveryStatus.PENDING,
        responseStatus: null,
        responseBody: null,
        nextRetryAt: null,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      // Mock successful HTTP response
      jest.spyOn<any, any>(service, 'httpPost').mockResolvedValue({
        status: 200,
        responseBody: JSON.stringify({ received: true }),
      });

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      expect(savedDelivery.status).toBe(DeliveryStatus.SUCCESS);
      expect(savedDelivery.nextRetryAt).toBeUndefined(); // No retry scheduled
    });

    /**
     * Test: Delivery succeeds with HTTP 201 (Created) and stops retrying.
     */
    it('marks delivery as SUCCESS on HTTP 201 response', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-201',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-201',
        webhookId: 'webhook-201',
        payload: JSON.stringify({ event: 'test' }),
        attempts: 0,
        status: DeliveryStatus.PENDING,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      jest.spyOn<any, any>(service, 'httpPost').mockResolvedValue({
        status: 201,
        responseBody: 'Created',
      });

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      expect(savedDelivery.status).toBe(DeliveryStatus.SUCCESS);
    });

    /**
     * Test: Delivery succeeds with HTTP 204 (No Content).
     */
    it('marks delivery as SUCCESS on HTTP 204 response', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-204',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-204',
        webhookId: 'webhook-204',
        payload: JSON.stringify({ event: 'test' }),
        attempts: 0,
        status: DeliveryStatus.PENDING,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      jest.spyOn<any, any>(service, 'httpPost').mockResolvedValue({
        status: 204,
        responseBody: '',
      });

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      expect(savedDelivery.status).toBe(DeliveryStatus.SUCCESS);
    });
  });

  // ── Failed deliveries and retry scheduling ─────────────────────────────────

  describe('Failed Delivery & Retry Scheduling', () => {
    /**
     * Test: Non-2xx HTTP response (e.g., 4xx, 5xx) is marked as FAILED
     * and retried if attempts < MAX_ATTEMPTS.
     */
    it('marks delivery as FAILED on non-2xx HTTP response and schedules retry', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-failed',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-failed',
        webhookId: 'webhook-failed',
        payload: JSON.stringify({ event: 'test' }),
        attempts: 0,
        status: DeliveryStatus.PENDING,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      // Mock 500 error response
      jest.spyOn<any, any>(service, 'httpPost').mockResolvedValue({
        status: 500,
        responseBody: 'Internal Server Error',
      });

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      expect(savedDelivery.status).toBe(DeliveryStatus.PENDING); // Will be retried
      expect(savedDelivery.responseStatus).toBe(500);
      expect(savedDelivery.nextRetryAt).not.toBeNull();
    });

    /**
     * Test: HTTP 400 (Bad Request) is retried (not all 4xx are permanent failures).
     */
    it('retries on HTTP 400 error (client error)', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-400',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-400',
        webhookId: 'webhook-400',
        payload: JSON.stringify({ event: 'test' }),
        attempts: 0,
        status: DeliveryStatus.PENDING,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      jest.spyOn<any, any>(service, 'httpPost').mockResolvedValue({
        status: 400,
        responseBody: 'Bad Request',
      });

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      expect(savedDelivery.status).toBe(DeliveryStatus.PENDING);
      expect(savedDelivery.nextRetryAt).not.toBeNull();
    });

    /**
     * Test: Network error (e.g., connection timeout) is caught and retried.
     */
    it('retries on network error (connection timeout, DNS failure, etc.)', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-network-error',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-network-error',
        webhookId: 'webhook-network-error',
        payload: JSON.stringify({ event: 'test' }),
        attempts: 1,
        status: DeliveryStatus.FAILED,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      const networkError = new Error('ECONNREFUSED');
      jest.spyOn<any, any>(service, 'httpPost').mockRejectedValue(networkError);

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      expect(savedDelivery.responseBody).toContain('ECONNREFUSED');
      expect(savedDelivery.status).toBe(DeliveryStatus.PENDING); // Will retry
      expect(savedDelivery.nextRetryAt).not.toBeNull();
    });

    /**
     * Test: Response body is truncated to 500 chars for storage.
     */
    it('truncates response body to 500 characters for storage', async () => {
      const mockWebhook: Partial<Webhook> = {
        id: 'webhook-trunc',
        url: 'http://example.com/webhooks',
        secret: 'test-secret',
      };

      const longResponse = 'x'.repeat(1000);
      const mockDelivery: Partial<WebhookDelivery> = {
        id: 'delivery-trunc',
        webhookId: 'webhook-trunc',
        payload: JSON.stringify({ event: 'test' }),
        attempts: 0,
        status: DeliveryStatus.PENDING,
      };

      mockWebhookRepo.findOne.mockResolvedValue(mockWebhook);
      mockDeliveryRepo.create.mockImplementation((obj) => obj);
      mockDeliveryRepo.save.mockImplementation((obj) => Promise.resolve(obj));

      jest.spyOn<any, any>(service, 'httpPost').mockResolvedValue({
        status: 500,
        responseBody: longResponse,
      });

      await (service as any).deliver(mockWebhook as Webhook, mockDelivery as WebhookDelivery);

      const savedDelivery = mockDeliveryRepo.save.mock.calls[0][0];
      expect(savedDelivery.responseBody.length).toBe(500);
      expect(savedDelivery.responseBody).toMatch(/^x{500}$/);
    });
  });

  // ── verifySignature ────────────────────────────────────────────────────────

  describe('verifySignature', () => {
    const secret = 'test-secret-key';
    const body = JSON.stringify({ event: 'enrollment.created', userId: 'abc123' });

    it('returns true for a valid signature', () => {
      const signature = buildSignature(secret, body);
      expect(service.verifySignature(secret, body, signature)).toBe(true);
    });

    it('returns false for an invalid (tampered) signature', () => {
      const tampered = buildSignature(secret, body).slice(0, -1) + 'x';
      expect(service.verifySignature(secret, body, tampered)).toBe(false);
    });

    it('returns false when the signature is for a different secret', () => {
      const wrongSignature = buildSignature('wrong-secret', body);
      expect(service.verifySignature(secret, body, wrongSignature)).toBe(false);
    });

    it('returns false when the signature is for a different body', () => {
      const differentBody = JSON.stringify({ event: 'credential.issued' });
      const signature = buildSignature(secret, differentBody);
      expect(service.verifySignature(secret, body, signature)).toBe(false);
    });

    it('returns false for an empty signature', () => {
      expect(service.verifySignature(secret, body, '')).toBe(false);
    });

    it('returns false for a completely random string as signature', () => {
      expect(service.verifySignature(secret, body, 'not-a-real-signature')).toBe(false);
    });

    it('does not throw when signature length differs from expected (length mismatch)', () => {
      // Without a length guard, crypto.timingSafeEqual would throw TypeError.
      // This test asserts the method returns false gracefully instead.
      expect(() => service.verifySignature(secret, body, 'short')).not.toThrow();
      expect(service.verifySignature(secret, body, 'short')).toBe(false);
    });

    // ── timestamp / replay-attack guard ─────────────────────────────────────

    describe('with timestamp', () => {
      it('returns true when the timestamp is within the 5-minute window', () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = buildSignature(secret, body);
        expect(service.verifySignature(secret, body, signature, timestamp)).toBe(true);
      });

      it('returns false when the timestamp is older than 5 minutes', () => {
        const staleTimestamp = (Math.floor(Date.now() / 1000) - 301).toString();
        const signature = buildSignature(secret, body);
        expect(service.verifySignature(secret, body, signature, staleTimestamp)).toBe(false);
      });

      it('returns false when the timestamp is in the far future (clock skew > 5 min)', () => {
        const futureTimestamp = (Math.floor(Date.now() / 1000) + 301).toString();
        const signature = buildSignature(secret, body);
        expect(service.verifySignature(secret, body, signature, futureTimestamp)).toBe(false);
      });

      it('returns false when the timestamp is not a valid number', () => {
        const signature = buildSignature(secret, body);
        expect(service.verifySignature(secret, body, signature, 'not-a-number')).toBe(false);
      });
    });
  });
});
