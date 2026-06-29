export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_METADATA = 'rate-limit:config';

export type UserRateLimitRole = 'admin' | 'instructor' | 'student' | 'guest';

export const DEFAULT_RATE_LIMITS: Record<UserRateLimitRole, RateLimitConfig> = {
  admin: { limit: 10000, windowMs: 60000 },
  instructor: { limit: 5000, windowMs: 60000 },
  student: { limit: 1000, windowMs: 60000 },
  guest: { limit: 100, windowMs: 60000 },
};

export const AUTH_RATE_LIMIT: RateLimitConfig = { limit: 20, windowMs: 60000 };

/**
 * Per-IP rate limit applied to unauthenticated auth endpoints (login, register).
 * 10 requests per minute per IP address.
 */
export const IP_AUTH_RATE_LIMIT: RateLimitConfig = { limit: 10, windowMs: 60000 };
