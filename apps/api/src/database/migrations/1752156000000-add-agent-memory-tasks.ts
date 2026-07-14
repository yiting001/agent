import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentMemoryTasks1752156000000 implements MigrationInterface {
  name = 'AddAgentMemoryTasks1752156000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "agent_memories" ADD COLUMN "idempotencyKey" text',
    );
    await queryRunner.query(
      'ALTER TABLE "agent_memories" ADD COLUMN "indexedAt" datetime',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_agent_memories_episode_idempotency"
      ON "agent_memories" ("agentId", "ownerKey", "idempotencyKey")
      WHERE "type" = 'episodic' AND "idempotencyKey" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "agent_memory_tasks" (
        "id" text PRIMARY KEY NOT NULL,
        "memoryId" text NOT NULL,
        "agentId" text NOT NULL,
        "ownerKey" text NOT NULL,
        "kind" text NOT NULL,
        "status" text NOT NULL,
        "attempts" integer NOT NULL DEFAULT (0),
        "maxAttempts" integer NOT NULL,
        "nextRunAt" datetime NOT NULL,
        "lockedAt" datetime,
        "lockOwner" text,
        "lastError" text,
        "embeddingJson" text,
        "embeddingDimensions" integer,
        "createdAt" datetime NOT NULL,
        "updatedAt" datetime NOT NULL,
        "completedAt" datetime,
        CONSTRAINT "FK_agent_memory_tasks_memory"
          FOREIGN KEY ("memoryId") REFERENCES "agent_memories" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_agent_memory_tasks_agent"
          FOREIGN KEY ("agentId") REFERENCES "agents" ("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_agent_memory_tasks_memory_kind"
      ON "agent_memory_tasks" ("memoryId", "kind")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_tasks_claim"
      ON "agent_memory_tasks" ("status", "nextRunAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_tasks_reclaim"
      ON "agent_memory_tasks" ("status", "lockedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_tasks_owner"
      ON "agent_memory_tasks" ("agentId", "ownerKey", "status")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_tasks_owner"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_tasks_reclaim"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_tasks_claim"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_agent_memory_tasks_memory_kind"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "agent_memory_tasks"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_agent_memories_episode_idempotency"',
    );
    await queryRunner.query(
      'ALTER TABLE "agent_memories" DROP COLUMN "indexedAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "agent_memories" DROP COLUMN "idempotencyKey"',
    );
  }
}
