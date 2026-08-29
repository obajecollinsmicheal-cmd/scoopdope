import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCertificateRevokedAt1749100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "revokedAt" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "certificates" DROP COLUMN IF EXISTS "revokedAt"
    `);
  }
}
