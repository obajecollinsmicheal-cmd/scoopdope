import { Module } from '@nestjs/common';
import { UserRateLimitService } from './user-rate-limit.service';
import { UserRateLimitGuard } from './user-rate-limit.guard';
import { IpRateLimitGuard } from './ip-rate-limit.guard';

@Module({
  providers: [UserRateLimitService, UserRateLimitGuard, IpRateLimitGuard],
  exports: [UserRateLimitService, UserRateLimitGuard, IpRateLimitGuard],
})
export class RateLimitModule {}
