import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEpisodicMemoryArtifacts1752155000000
  implements MigrationInterface
{
  name = 'AddEpisodicMemoryArtifacts1752155000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_memories" ADD COLUMN "status" text NOT NULL DEFAULT ('ready')`,
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memories_agent_content"',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_agent_memories_stable_content"
      ON "agent_memories" ("agentId", "ownerKey", "content")
      WHERE "type" <> 'episodic'
    `);
    await queryRunner.query(`
      CREATE TABLE "agent_memory_artifacts" (
        "id" text PRIMARY KEY NOT NULL,
        "memoryId" text NOT NULL,
        "agentId" text NOT NULL,
        "ownerKey" text NOT NULL,
        "attachmentId" text NOT NULL,
        "fileName" text NOT NULL,
        "mimeType" text NOT NULL,
        "sizeBytes" integer NOT NULL,
        "createdAt" datetime NOT NULL,
        CONSTRAINT "FK_agent_memory_artifacts_memory"
          FOREIGN KEY ("memoryId") REFERENCES "agent_memories" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_agent_memory_artifacts_agent"
          FOREIGN KEY ("agentId") REFERENCES "agents" ("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_agent_memory_artifacts_memory_attachment"
      ON "agent_memory_artifacts" ("memoryId", "attachmentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_artifacts_agent_owner"
      ON "agent_memory_artifacts" ("agentId", "ownerKey")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agent_memory_artifacts_attachment"
      ON "agent_memory_artifacts" ("attachmentId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_artifacts_attachment"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_artifacts_agent_owner"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memory_artifacts_memory_attachment"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "agent_memory_artifacts"');
    await queryRunner.query(
      `DELETE FROM "agent_memories" WHERE "type" = 'episodic'`,
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_agent_memories_stable_content"',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_agent_memories_agent_content"
      ON "agent_memories" ("agentId", "ownerKey", "content")
    `);
    await queryRunner.query(
      'ALTER TABLE "agent_memories" DROP COLUMN "status"',
    );
  }
}
