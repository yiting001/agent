import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialKnowledgePlatform1752150000000
  implements MigrationInterface
{
  name = 'InitialKnowledgePlatform1752150000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "model_providers" (
        "id" text PRIMARY KEY NOT NULL,
        "key" text NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "baseUrl" text NOT NULL,
        "chatModel" text,
        "embeddingModel" text,
        "embeddingDimensions" integer,
        "credentialCiphertext" text NOT NULL,
        "credentialInitializationVector" text NOT NULL,
        "credentialAuthTag" text NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "UQ_model_providers_key" UNIQUE ("key")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_bases" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "embeddingProviderId" text NOT NULL,
        "embeddingModel" text NOT NULL,
        "embeddingDimensions" integer NOT NULL,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_modules" (
        "id" text PRIMARY KEY NOT NULL,
        "knowledgeBaseId" text NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_knowledge_modules_base_name"
      ON "knowledge_modules" ("knowledgeBaseId", "name")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_documents" (
        "id" text PRIMARY KEY NOT NULL,
        "moduleId" text NOT NULL,
        "fileName" text NOT NULL,
        "mimeType" text NOT NULL,
        "sizeBytes" integer NOT NULL,
        "sha256" text NOT NULL,
        "storageKey" text NOT NULL,
        "status" text NOT NULL,
        "chunkCount" integer NOT NULL DEFAULT (0),
        "errorMessage" text,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_knowledge_documents_module_hash"
      ON "knowledge_documents" ("moduleId", "sha256")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_upload_sessions" (
        "id" text PRIMARY KEY NOT NULL,
        "moduleId" text NOT NULL,
        "fileName" text NOT NULL,
        "mimeType" text NOT NULL,
        "totalBytes" integer NOT NULL,
        "chunkSizeBytes" integer NOT NULL,
        "expectedParts" integer NOT NULL,
        "receivedBytes" integer NOT NULL,
        "status" text NOT NULL,
        "expiresAt" timestamp with time zone NOT NULL,
        "createdAt" timestamp with time zone NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_upload_parts" (
        "id" text PRIMARY KEY NOT NULL,
        "uploadSessionId" text NOT NULL,
        "partNumber" integer NOT NULL,
        "sizeBytes" integer NOT NULL,
        "sha256" text NOT NULL,
        "storageKey" text NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_upload_parts_session_number"
      ON "knowledge_upload_parts" ("uploadSessionId", "partNumber")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_ingestion_jobs" (
        "id" text PRIMARY KEY NOT NULL,
        "documentId" text NOT NULL,
        "status" text NOT NULL,
        "progress" integer NOT NULL,
        "attempts" integer NOT NULL,
        "errorMessage" text,
        "startedAt" timestamp with time zone,
        "completedAt" timestamp with time zone,
        "createdAt" timestamp with time zone NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ingestion_jobs_status_created"
      ON "knowledge_ingestion_jobs" ("status", "createdAt")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agents" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "systemPrompt" text NOT NULL,
        "providerId" text NOT NULL,
        "temperature" real NOT NULL DEFAULT (0.2),
        "status" text NOT NULL,
        "conversationCount" integer NOT NULL DEFAULT (0),
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_knowledge_modules" (
        "id" text PRIMARY KEY NOT NULL,
        "agentId" text NOT NULL,
        "moduleId" text NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_modules_agent_module"
      ON "agent_knowledge_modules" ("agentId", "moduleId")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_applications" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "agentId" text NOT NULL,
        "keyHash" text NOT NULL,
        "maskedKey" text NOT NULL,
        "status" text NOT NULL,
        "requestCount" integer NOT NULL DEFAULT (0),
        "createdAt" timestamp with time zone NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_api_applications_key_hash"
      ON "api_applications" ("keyHash")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "api_applications"');
    await queryRunner.query('DROP TABLE IF EXISTS "agent_knowledge_modules"');
    await queryRunner.query('DROP TABLE IF EXISTS "agents"');
    await queryRunner.query('DROP TABLE IF EXISTS "knowledge_ingestion_jobs"');
    await queryRunner.query('DROP TABLE IF EXISTS "knowledge_upload_parts"');
    await queryRunner.query('DROP TABLE IF EXISTS "knowledge_upload_sessions"');
    await queryRunner.query('DROP TABLE IF EXISTS "knowledge_documents"');
    await queryRunner.query('DROP TABLE IF EXISTS "knowledge_modules"');
    await queryRunner.query('DROP TABLE IF EXISTS "knowledge_bases"');
    await queryRunner.query('DROP TABLE IF EXISTS "model_providers"');
  }
}
