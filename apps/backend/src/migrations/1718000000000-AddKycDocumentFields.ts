import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKycDocumentFields1718000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE kyc_customers
      ADD COLUMN documentType VARCHAR(30) NULL,
      ADD COLUMN documentUrl TEXT NULL,
      ADD COLUMN selfieUrl TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE kyc_customers
      DROP COLUMN documentType,
      DROP COLUMN documentUrl,
      DROP COLUMN selfieUrl
    `);
  }
}
