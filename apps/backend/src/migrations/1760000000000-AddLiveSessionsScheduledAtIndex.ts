import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a B-tree index on live_sessions("scheduledAt") so that
 * sendReminders() (which filters by scheduledAt > NOW()) can use
 * an index scan instead of a full sequential scan as the table grows.
 */
export class AddLiveSessionsScheduledAtIndex1760000000000
  implements MigrationInterface
{
  name = 'AddLiveSessionsScheduledAtIndex1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_live_sessions_scheduledAt"
        ON "live_sessions" ("scheduledAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_live_sessions_scheduledAt"
    `);
  }
}
