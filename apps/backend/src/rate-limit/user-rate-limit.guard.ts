import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRateLimitService } from './user-rate-limit.service';
import { RATE_LIMIT_METADATA, RateLimitConfig } from './rate-limit.constants';

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: UserRateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const userId: string | null = request.user?.id || null;
    const ip: string =
      request.ip ||
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.connection?.remoteAddress ||
      'unknown';
    const userRole: string | undefined = request.user?.role;
    const authenticated = !!request.user?.id;

    const overrideConfig = this.reflector.get<Partial<RateLimitConfig> | undefined>(
      RATE_LIMIT_METADATA,
      context.getHandler(),
    );

    const role = this.rateLimitService.resolveRole(userRole, authenticated);

    const allowed = await this.rateLimitService.checkRateLimit(userId, ip, role, overrideConfig);

    const status = await this.rateLimitService.getRateLimitStatus(userId, ip, role, overrideConfig);
    response.set({
      'X-RateLimit-Limit': status.limit.toString(),
      'X-RateLimit-Remaining': status.remaining.toString(),
      'X-RateLimit-Reset': status.resetTime.toISOString(),
    });

    if (!allowed) {
      // Compute seconds until the rate-limit window resets and send it as
      // Retry-After so clients can implement intelligent back-off.
      const retryAfterSeconds = Math.ceil(
        (status.resetTime.getTime() - Date.now()) / 1000,
      );
      response.set('Retry-After', String(Math.max(retryAfterSeconds, 1)));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Please slow down your requests.',
          retryAfter: status.resetTime.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
