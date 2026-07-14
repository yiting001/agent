import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKnowledgeIngestionLeases1752158000000
  implements MigrationInterface
{
  name = 'AddKnowledgeIngestionLeases1752158000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" ADD COLUMN "maxAttempts" integer NOT NULL DEFAULT (3)',
    );
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" ADD COLUMN "nextRunAt" timestamp with time zone',
    );
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" ADD COLUMN "lockedAt" timestamp with time zone',
    );
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" ADD COLUMN "lockOwner" text',
    );
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" ADD COLUMN "updatedAt" timestamp with time zone',
    );
    await queryRunner.query(`
      UPDATE "knowledge_ingestion_jobs"
      SET
        "nextRunAt" = COALESCE("startedAt", "createdAt"),
        "updatedAt" = COALESCE("completedAt", "startedAt", "createdAt")
    `);
    await queryRunner.query(`
      UPDATE "knowledge_ingestion_jobs"
      SET
        "completedAt" = CASE
          WHEN "attempts" >= "maxAttempts" THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,
        "errorMessage" = CASE
          WHEN "attempts" >= "maxAttempts"
            THEN '迁移时发现已耗尽尝试次数的中断摄取任务。'
          ELSE '迁移时回收了缺少租约的中断摄取任务。'
        END,
        "status" = CASE
          WHEN "attempts" >= "maxAttempts" THEN 'failed'
          ELSE 'queued'
        END,
        "nextRunAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "status" = 'processing'
    `);
    await queryRunner.query(`
      UPDATE "knowledge_documents" AS document
      SET
        "errorMessage" = job."errorMessage",
        "status" = 'failed',
        "updatedAt" = job."updatedAt"
      FROM "knowledge_ingestion_jobs" AS job
      WHERE
        job."documentId" = document."id"
        AND job."status" = 'failed'
    `);
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" ALTER COLUMN "nextRunAt" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" ALTER COLUMN "updatedAt" SET NOT NULL',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_ingestion_jobs_status_created"',
    );
    await queryRunner.query(`
      CREATE INDEX "IDX_ingestion_jobs_claim"
      ON "knowledge_ingestion_jobs" ("status", "nextRunAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ingestion_jobs_reclaim"
      ON "knowledge_ingestion_jobs" ("status", "lockedAt")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "knowledge_ingestion_jobs"
      SET
        "completedAt" = NULL,
        "status" = 'queued'
      WHERE "status" = 'processing'
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_ingestion_jobs_reclaim"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_ingestion_jobs_claim"');
    await queryRunner.query(`
      CREATE INDEX "IDX_ingestion_jobs_status_created"
      ON "knowledge_ingestion_jobs" ("status", "createdAt")
    `);
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" DROP COLUMN "updatedAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" DROP COLUMN "lockOwner"',
    );
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" DROP COLUMN "lockedAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" DROP COLUMN "nextRunAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "knowledge_ingestion_jobs" DROP COLUMN "maxAttempts"',
    );
  }
}
