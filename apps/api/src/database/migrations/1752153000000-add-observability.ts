import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddObservability1752153000000 implements MigrationInterface {
  name = 'AddObservability1752153000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "model_providers" ADD "chatInputCostPerMillionTokens" real',
    );
    await queryRunner.query(
      'ALTER TABLE "model_providers" ADD "chatOutputCostPerMillionTokens" real',
    );
    await queryRunner.query(
      'ALTER TABLE "model_providers" ADD "embeddingInputCostPerMillionTokens" real',
    );
    await queryRunner.query(`
      CREATE TABLE "observability_events" (
        "id" text PRIMARY KEY NOT NULL,
        "traceId" text NOT NULL,
        "spanId" text NOT NULL,
        "parentSpanId" text,
        "category" text NOT NULL,
        "operation" text NOT NULL,
        "status" text NOT NULL,
        "startedAt" datetime NOT NULL,
        "durationMs" real NOT NULL,
        "method" text,
        "route" text,
        "statusCode" integer,
        "agentId" text,
        "providerId" text,
        "model" text,
        "inputTokens" integer NOT NULL DEFAULT (0),
        "outputTokens" integer NOT NULL DEFAULT (0),
        "tokenCountSource" text NOT NULL DEFAULT ('unavailable'),
        "costUsdMicros" integer NOT NULL DEFAULT (0),
        "errorMessage" text,
        "alertSeverity" text,
        "alertMessage" text,
        "metadata" text NOT NULL DEFAULT ('{}')
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_observability_events_started"
      ON "observability_events" ("startedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_observability_events_trace"
      ON "observability_events" ("traceId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_observability_events_trace"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_observability_events_started"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "observability_events"');
  }
}
