import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentSkills1752152000000 implements MigrationInterface {
  name = 'AddAgentSkills1752152000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "skills" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "type" text NOT NULL,
        "content" text NOT NULL DEFAULT (''),
        "endpoint" text NOT NULL DEFAULT (''),
        "headers" jsonb NOT NULL,
        "tools" jsonb NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_skills" (
        "id" text PRIMARY KEY NOT NULL,
        "agentId" text NOT NULL,
        "skillId" text NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_skills_agent_skill"
      ON "agent_skills" ("agentId", "skillId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_agent_skills_agent_skill"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_skills"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "skills"`);
  }
}
