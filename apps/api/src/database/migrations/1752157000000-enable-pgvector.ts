import type { MigrationInterface, QueryRunner } from 'typeorm';

import { unwrapPostgresRows } from '../../shared/infrastructure/postgres/postgres-query-result';

export class EnablePgvector1752157000000 implements MigrationInterface {
  name = 'EnablePgvector1752157000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');
    await queryRunner.query(`
      CREATE TABLE "vector_collections" (
        "kind" text NOT NULL,
        "dimensions" integer NOT NULL,
        "storageType" text NOT NULL,
        "createdAt" timestamp with time zone NOT NULL,
        PRIMARY KEY ("kind", "dimensions")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const result: unknown = await queryRunner.query(
      'SELECT "kind", "dimensions" FROM "vector_collections"',
    );
    const collections = unwrapPostgresRows<{
      dimensions: number;
      kind: string;
    }>(result);

    for (const collection of collections) {
      const tableName = `${collection.kind}_vectors_d${collection.dimensions}`;

      if (/^(agent_memory|knowledge)_vectors_d\d+$/.test(tableName)) {
        await queryRunner.query(`DROP TABLE IF EXISTS "${tableName}"`);
      }
    }

    await queryRunner.query('DROP TABLE IF EXISTS "vector_collections"');
  }
}
