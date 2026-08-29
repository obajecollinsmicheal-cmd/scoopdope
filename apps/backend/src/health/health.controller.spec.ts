import { HealthController } from './health.controller';
import { HealthCheckService } from '@nestjs/terminus';
import { Logger } from 'winston';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let dataSource: { createQueryRunner: jest.Mock };
  let logger: Logger;

  beforeEach(() => {
    healthCheckService = {
      check: jest.fn(),
    };

    dataSource = {
      createQueryRunner: jest.fn(),
    };

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as Logger;

    controller = new (HealthController as any)(
      healthCheckService,
      { pingCheck: jest.fn() },
      dataSource,
      { checkHeap: jest.fn(), checkRSS: jest.fn() },
      { pingCheck: jest.fn() },
      {},
      logger
    );
  });

  it('uses a write transaction to validate database health', async () => {
    const queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
    dataSource.createQueryRunner.mockReturnValue(queryRunner);

    healthCheckService.check.mockImplementation(async (checks: Array<() => Promise<unknown>>) => {
      for (const check of checks) {
        await check();
      }

      return { status: 'ok', details: {} };
    });

    await controller.check();

    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.query).toHaveBeenCalledWith('BEGIN');
    expect(queryRunner.query).toHaveBeenCalledWith('INSERT INTO health_checks (ts) VALUES (now())');
    expect(queryRunner.query).toHaveBeenCalledWith('ROLLBACK');
    expect(queryRunner.release).toHaveBeenCalled();
  });
});
