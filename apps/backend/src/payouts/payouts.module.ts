import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { Payout } from './payout.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from '../courses/course.entity';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payout, Enrollment, Course]), KycModule],
  providers: [PayoutsService],
  controllers: [PayoutsController],
  exports: [PayoutsService],
})
export class PayoutsModule {}
