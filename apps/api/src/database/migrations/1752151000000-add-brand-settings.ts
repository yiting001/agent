import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrandSettings1752151000000 implements MigrationInterface {
  name = 'AddBrandSettings1752151000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "brand_settings" (
        "id" text PRIMARY KEY NOT NULL,
        "softwareName" text NOT NULL,
        "iconStorageKey" text,
        "iconMimeType" text,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "brand_settings"');
  }
}
