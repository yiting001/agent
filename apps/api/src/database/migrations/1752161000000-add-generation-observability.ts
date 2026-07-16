import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGenerationObservability1752161000000
  implements MigrationInterface
{
  name = 'AddGenerationObservability1752161000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "observability_events" ADD "generationId" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" ADD "providerName" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" ADD "requestedModel" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" ADD "responseModel" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" ADD "upstreamResponseId" text',
    );
    await queryRunner.query(
      `ALTER TABLE "observability_events" ADD "finishReasons" jsonb NOT NULL DEFAULT ('[]'::jsonb)`,
    );
    await queryRunner.query(`
      CREATE INDEX "IDX_observability_events_generation"
      ON "observability_events" ("generationId")
    `);
    await queryRunner.query(`
      CREATE TABLE "observability_generations" (
        "id" text PRIMARY KEY NOT NULL,
        "traceId" text NOT NULL,
        "agentId" text NOT NULL,
        "conversationId" text,
        "actorKeyHash" text,
        "source" text NOT NULL,
        "providerId" text NOT NULL,
        "providerName" text NOT NULL,
        "requestedModel" text NOT NULL,
        "responseModel" text,
        "upstreamResponseId" text,
        "finishReasons" jsonb NOT NULL DEFAULT ('[]'::jsonb),
        "configuration" jsonb NOT NULL DEFAULT ('{}'::jsonb),
        "status" text NOT NULL,
        "startedAt" timestamp with time zone NOT NULL,
        "completedAt" timestamp with time zone
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_observability_generations_trace"
      ON "observability_generations" ("traceId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_observability_generations_agent"
      ON "observability_generations" ("agentId")
    `);
    await queryRunner.query(`
      CREATE TABLE "observability_generation_contents" (
        "generationId" text PRIMARY KEY NOT NULL,
        "captureMode" text NOT NULL,
        "inputMessages" jsonb NOT NULL DEFAULT ('[]'::jsonb),
        "outputText" text NOT NULL DEFAULT '',
        "redactionCount" integer NOT NULL DEFAULT (0),
        "truncated" boolean NOT NULL DEFAULT false,
        "expiresAt" timestamp with time zone NOT NULL,
        CONSTRAINT "FK_observability_generation_contents_generation"
          FOREIGN KEY ("generationId")
          REFERENCES "observability_generations" ("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_observability_generation_contents_expires"
      ON "observability_generation_contents" ("expiresAt")
    `);
    await queryRunner.query(`
      CREATE TABLE "observability_feedback" (
        "id" text PRIMARY KEY NOT NULL,
        "generationId" text NOT NULL,
        "actorKeyHash" text NOT NULL,
        "source" text NOT NULL,
        "metric" text NOT NULL,
        "rating" text NOT NULL,
        "reasonCodes" jsonb NOT NULL DEFAULT ('[]'::jsonb),
        "comment" text,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "FK_observability_feedback_generation"
          FOREIGN KEY ("generationId")
          REFERENCES "observability_generations" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "UQ_observability_feedback_actor_metric"
          UNIQUE ("generationId", "actorKeyHash", "metric")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_observability_feedback_generation"
      ON "observability_feedback" ("generationId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_observability_feedback_generation"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "observability_feedback"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_observability_generation_contents_expires"',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS "observability_generation_contents"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_observability_generations_agent"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_observability_generations_trace"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "observability_generations"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_observability_events_generation"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" DROP COLUMN "finishReasons"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" DROP COLUMN "upstreamResponseId"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" DROP COLUMN "responseModel"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" DROP COLUMN "requestedModel"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" DROP COLUMN "providerName"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_events" DROP COLUMN "generationId"',
    );
  }
}
