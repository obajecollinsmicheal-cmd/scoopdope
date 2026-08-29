import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';
import { CustomLoggerService } from '../common/logger/logger.service';
import { DistributedLockService } from '../common/distributed-lock.service';

const RETENTION_DAYS = 90;

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private logger: CustomLoggerService,
    private readonly distributedLockService: DistributedLockService,
  ) {
    this.logger.setContext('AuditService');
  }

  async log(
    action: AuditAction | string,
    userId: string | null,
    success: boolean,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditRepo.save({ action, userId, success, metadata, ipAddress, userAgent });
      this.logger.info(`Audit: ${action}`, { userId, success, metadata } as any);
    } catch (err) {
      this.logger.error('Failed to write audit log', err as any);
    }
  }

  async getLogs(filters: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const qb = this.auditRepo.createQueryBuilder('log');
    if (filters.userId) qb.andWhere('log.userId = :userId', { userId: filters.userId });
    if (filters.action) qb.andWhere('log.action = :action', { action: filters.action });
    if (filters.startDate) qb.andWhere('log.createdAt >= :start', { start: filters.startDate });
    if (filters.endDate) qb.andWhere('log.createdAt <= :end', { end: filters.endDate });
    qb.orderBy('log.createdAt', 'DESC').limit(filters.limit || 100);
    return qb.getMany();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeOldLogs(): Promise<void> {
    const lockKey = 'lock:cron:audit:purgeOldLogs';
    const result = await this.distributedLockService.withLock(lockKey, async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
      const { affected } = await this.auditRepo.delete({ createdAt: LessThan(cutoff) });
      this.logger.info(`Audit retention: purged ${affected ?? 0} logs older than ${RETENTION_DAYS} days`);
    }, 60);

    if (result === null) {
      this.logger.debug('Skipping audit retention purge because another instance holds the lock');
    }
  }
}
