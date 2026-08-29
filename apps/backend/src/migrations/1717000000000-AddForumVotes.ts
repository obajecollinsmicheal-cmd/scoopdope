import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddForumVotes1717000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add upvotes and downvotes to posts
    await queryRunner.query(`
      ALTER TABLE posts
      ADD COLUMN upvotes INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN downvotes INTEGER NOT NULL DEFAULT 0
    `);

    // Add upvotes and downvotes to replies
    await queryRunner.query(`
      ALTER TABLE replies
      ADD COLUMN upvotes INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN downvotes INTEGER NOT NULL DEFAULT 0
    `);

    // Create forum_votes table
    await queryRunner.query(`
      CREATE TABLE forum_votes (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        targetType VARCHAR(10) NOT NULL,
        targetId VARCHAR(36) NOT NULL,
        direction VARCHAR(4) NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX IDX_forum_votes_user_target (userId, targetType, targetId)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE forum_votes`);
    await queryRunner.query(`ALTER TABLE replies DROP COLUMN upvotes, DROP COLUMN downvotes`);
    await queryRunner.query(`ALTER TABLE posts DROP COLUMN upvotes, DROP COLUMN downvotes`);
  }
}
