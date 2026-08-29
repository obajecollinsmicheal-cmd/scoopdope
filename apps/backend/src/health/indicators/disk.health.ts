import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { promisify } from 'util';
import { statfs as nodeStatfs } from 'fs';
import { DISK_HEALTH_THRESHOLD_PERCENT } from '../health.constants';

const statfs = promisify(nodeStatfs);

@Injectable()
export class DiskHealthIndicator extends HealthIndicator {
  private readonly diskPath: string;

  constructor(private readonly configService: ConfigService) {
    super();
    const isContainer = this.isRunningInContainer();
    this.diskPath = this.configService.get<string>(
      'health.diskPath',
      isContainer ? '/tmp' : '/',
    );
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      const diskInfo = await this.getDiskInfo();
      const usagePercent = (diskInfo.used / diskInfo.total) * 100;
      const healthy = usagePercent < DISK_HEALTH_THRESHOLD_PERCENT * 100;

      if (healthy) {
        return this.getStatus(key, true, {
          path: this.diskPath,
          totalBytes: diskInfo.total,
          freeBytes: diskInfo.free,
          usedBytes: diskInfo.used,
          usagePercent: Math.round(usagePercent * 100) / 100,
          threshold: DISK_HEALTH_THRESHOLD_PERCENT * 100,
        });
      }

      throw new HealthCheckError(
        'Disk usage exceeds threshold',
        this.getStatus(key, false, {
          path: this.diskPath,
          totalBytes: diskInfo.total,
          freeBytes: diskInfo.free,
          usedBytes: diskInfo.used,
          usagePercent: Math.round(usagePercent * 100) / 100,
          threshold: DISK_HEALTH_THRESHOLD_PERCENT * 100,
        }),
      );
    } catch (error: any) {
      if (error instanceof HealthCheckError) throw error;
      throw new HealthCheckError(
        'Disk health check failed',
        this.getStatus(key, false, { message: error.message, path: this.diskPath }),
      );
    }
  }

  private async getDiskInfo(): Promise<{ total: number; free: number; used: number }> {
    const stats = await statfs(this.diskPath);
    const total = stats.blocks * stats.bsize;
    const free = stats.bavail * stats.bsize;
    const used = total - free;
    return { total, free, used };
  }

  private isRunningInContainer(): boolean {
    // Check common container environment indicators
    return !!(
      process.env.DOCKER ||
      process.env.KUBERNETES_SERVICE_HOST ||
      process.env.CONTAINER ||
      process.env.RUN_IN_CONTAINER ||
      this.checkCgroupV1() ||
      this.checkCgroupV2()
    );
  }

  private checkCgroupV1(): boolean {
    try {
      const fs = require('fs');
      return fs.existsSync('/proc/self/cgroup') &&
        fs.readFileSync('/proc/self/cgroup', 'utf-8').includes('docker');
    } catch {
      return false;
    }
  }

  private checkCgroupV2(): boolean {
    try {
      const fs = require('fs');
      return fs.existsSync('/.dockerenv');
    } catch {
      return false;
    }
  }
}
