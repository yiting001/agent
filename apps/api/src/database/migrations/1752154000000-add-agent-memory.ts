import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentMemory1752154000000 implements MigrationInterface {
  name = 'AddAgentMemory1752154000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "agent_memory_threads" (
        "id" text NOT NULL,
        "agentId" text NOT NULL,
        "ownerKey" text NOT NULL,
        "source" text NOT NULL,
        "title" text NOT NULL,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        PRIMARY KEY ("id", "ownerKey"),
        CONSTRAINT "FK_agent_memory_threads_agent"
          FOREIGN KEY ("agentId") REFERENCES "agents" ("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_threads_agent"
      ON "agent_memory_threads" ("agentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_threads_owner"
      ON "agent_memory_threads" ("ownerKey")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_threads_updated"
      ON "agent_memory_threads" ("updatedAt")
    `);
    await queryRunner.query(`
      CREATE TABLE "agent_memory_messages" (
        "id" text PRIMARY KEY NOT NULL,
        "threadId" text NOT NULL,
        "ownerKey" text NOT NULL,
        "role" text NOT NULL,
        "content" text NOT NULL,
        "position" integer NOT NULL,
        "createdAt" timestamp with time zone NOT NULL,
        CONSTRAINT "FK_agent_memory_messages_thread"
          FOREIGN KEY ("threadId", "ownerKey")
          REFERENCES "agent_memory_threads" ("id", "ownerKey")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_messages_thread"
      ON "agent_memory_messages" ("threadId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_messages_owner"
      ON "agent_memory_messages" ("ownerKey")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_messages_created"
      ON "agent_memory_messages" ("createdAt")
    `);
    await queryRunner.query(`
      CREATE TABLE "agent_memories" (
        "id" text PRIMARY KEY NOT NULL,
        "agentId" text NOT NULL,
        "ownerKey" text NOT NULL,
        "type" text NOT NULL,
        "content" text NOT NULL,
        "sourceThreadId" text,
        "importance" integer NOT NULL,
        "accessCount" integer NOT NULL DEFAULT (0),
        "lastAccessedAt" timestamp with time zone,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "FK_agent_memories_agent"
          FOREIGN KEY ("agentId") REFERENCES "agents" ("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memories_agent"
      ON "agent_memories" ("agentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memories_owner"
      ON "agent_memories" ("ownerKey")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memories_updated"
      ON "agent_memories" ("updatedAt")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_agent_memories_agent_content"
      ON "agent_memories" ("agentId", "ownerKey", "content")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memories_agent_content"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memories_updated"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_agent_memories_owner"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_agent_memories_agent"');
    await queryRunner.query('DROP TABLE IF EXISTS "agent_memories"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_messages_created"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_messages_owner"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_messages_thread"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "agent_memory_messages"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_threads_updated"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_threads_owner"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_threads_agent"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "agent_memory_threads"');
  }
}
