import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillCoursePublishedAt1750000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'updatedAt'
        ) THEN
          UPDATE "courses"
          SET "publishedAt" = "updatedAt"
          WHERE "status" = 'published' AND "publishedAt" IS NULL;
        ELSE
          UPDATE "courses"
          SET "publishedAt" = "createdAt"
          WHERE "status" = 'published' AND "publishedAt" IS NULL;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "courses"
      SET "publishedAt" = NULL
      WHERE "status" = 'published' AND "publishedAt" IS NOT NULL
    `);
  }
}
