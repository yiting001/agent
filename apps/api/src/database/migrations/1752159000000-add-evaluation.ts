import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEvaluation1752159000000 implements MigrationInterface {
  name = 'AddEvaluation1752159000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "evaluation_suites" (
        "id" text PRIMARY KEY NOT NULL,
        "agentId" text NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "status" text NOT NULL,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "FK_evaluation_suites_agent"
          FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "evaluation_metrics" (
        "id" text PRIMARY KEY NOT NULL,
        "suiteId" text NOT NULL,
        "name" text NOT NULL,
        "kind" text NOT NULL,
        "weight" real NOT NULL,
        "passingThreshold" real NOT NULL,
        CONSTRAINT "FK_evaluation_metrics_suite"
          FOREIGN KEY ("suiteId") REFERENCES "evaluation_suites"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "evaluation_cases" (
        "id" text PRIMARY KEY NOT NULL,
        "suiteId" text NOT NULL,
        "input" text NOT NULL,
        "expectedKeywords" jsonb NOT NULL DEFAULT ('[]'::jsonb),
        CONSTRAINT "FK_evaluation_cases_suite"
          FOREIGN KEY ("suiteId") REFERENCES "evaluation_suites"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "evaluation_runs" (
        "id" text PRIMARY KEY NOT NULL,
        "suiteId" text NOT NULL,
        "agentId" text NOT NULL,
        "status" text NOT NULL,
        "score" real NOT NULL,
        "totalCases" integer NOT NULL,
        "startedAt" timestamp with time zone NOT NULL,
        "completedAt" timestamp with time zone,
        "errorMessage" text,
        CONSTRAINT "FK_evaluation_runs_suite"
          FOREIGN KEY ("suiteId") REFERENCES "evaluation_suites"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_evaluation_runs_agent"
          FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "evaluation_case_results" (
        "id" text PRIMARY KEY NOT NULL,
        "runId" text NOT NULL,
        "caseId" text NOT NULL,
        "status" text NOT NULL,
        "score" real NOT NULL,
        "answer" text NOT NULL,
        "input" text NOT NULL,
        "sequence" integer NOT NULL,
        "matchedKeywords" jsonb NOT NULL DEFAULT ('[]'::jsonb),
        "missingKeywords" jsonb NOT NULL DEFAULT ('[]'::jsonb),
        "errorMessage" text,
        CONSTRAINT "FK_evaluation_case_results_run"
          FOREIGN KEY ("runId") REFERENCES "evaluation_runs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_evaluation_case_results_case"
          FOREIGN KEY ("caseId") REFERENCES "evaluation_cases"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_suites_agent"
      ON "evaluation_suites" ("agentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_runs_suite_started"
      ON "evaluation_runs" ("suiteId", "startedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_case_results_run"
      ON "evaluation_case_results" ("runId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_evaluation_case_results_run"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_evaluation_runs_suite_started"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_evaluation_suites_agent"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "evaluation_case_results"');
    await queryRunner.query('DROP TABLE IF EXISTS "evaluation_runs"');
    await queryRunner.query('DROP TABLE IF EXISTS "evaluation_cases"');
    await queryRunner.query('DROP TABLE IF EXISTS "evaluation_metrics"');
    await queryRunner.query('DROP TABLE IF EXISTS "evaluation_suites"');
  }
}
