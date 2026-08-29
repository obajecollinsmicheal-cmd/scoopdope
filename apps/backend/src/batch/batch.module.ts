import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJob } from './batch-job.entity';
import { BatchService } from './batch.service';
import { BatchQueueService } from './batch.queue.service';
import { BatchController } from './batch.controller';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [ConfigModule, HttpModule, TypeOrmModule.forFeature([BatchJob]), UsersModule, CoursesModule],
  providers: [BatchService, BatchQueueService],
  controllers: [BatchController],
  exports: [BatchQueueService],
})
export class BatchModule {}
