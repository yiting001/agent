import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { AgentMemoryTaskScheduler } from '../src/modules/agent-memory/infrastructure/agent-memory-task.scheduler';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';
import { ObservabilityContentMigrator } from '../src/modules/observability/infrastructure/observability-content-migrator';
import { MANAGEMENT_TEST_AUTHORIZATION } from './management-test-credentials';

const LEGACY_GENERATION_ID = 'migration-legacy-generation';
const INVALID_GENERATION_ID = 'migration-invalid-generation';

interface ContentStorageRow {
  authTag: string | null;
  ciphertext: string | null;
  initializationVector: string | null;
  inputMessages: unknown;
  keyVersion: string | null;
  outputText: string | null;
}

describe('Database migrations', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    process.env.DATABASE_MIGRATIONS_RUN = 'true';
    process.env.DATABASE_SYNCHRONIZE = 'false';

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IngestionScheduler)
      .useValue({
        onApplicationBootstrap: () => undefined,
        onApplicationShutdown: () => undefined,
      })
      .overrideProvider(AgentMemoryTaskScheduler)
      .useValue({
        dispatch: () => undefined,
        onApplicationBootstrap: () => undefined,
        onApplicationShutdown: () => undefined,
      })
      .compile();

    app = testingModule.createNestApplication<INestApplication<Server>>();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates the knowledge platform schema', async () => {
    await request(app.getHttpServer()).get('/api/agents').expect(200, []);
    await request(app.getHttpServer())
      .get('/api/knowledge-bases')
      .expect(200, []);
    await request(app.getHttpServer())
      .get('/api/model-providers')
      .expect(200, []);
    await request(app.getHttpServer())
      .get('/api/branding')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            hasCustomIcon: false,
          }),
        );
      });
    await request(app.getHttpServer())
      .get('/api/observability/dashboard?hours=24')
      .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
      .expect(200)
      .expect((response) => {
        expect(response.text).toContain('"goldenSignals"');
        expect(response.text).toContain('"recentTraces"');
        expect(response.text).toContain('"usage"');
      });
  });

  it('migrates and rolls back observability, prompt policies, evaluation and infrastructure changes', async () => {
    const dataSource = app.get(DataSource);
    const queryRunner = dataSource.createQueryRunner();

    try {
      await assertInvalidEncryptedContentFailsClosed(app, queryRunner);
      await insertLegacyObservabilityContent(queryRunner);
      await app.get(ObservabilityContentMigrator).onApplicationBootstrap();

      const taskTable = await queryRunner.getTable('agent_memory_tasks');
      const memoryTable = await queryRunner.getTable('agent_memories');
      const vectorCollections =
        await queryRunner.getTable('vector_collections');
      const ingestionJobs = await queryRunner.getTable(
        'knowledge_ingestion_jobs',
      );
      const promptPolicies = await queryRunner.getTable('prompt_policies');
      const generations = await queryRunner.getTable(
        'observability_generations',
      );
      const generationContents = await queryRunner.getTable(
        'observability_generation_contents',
      );
      const feedback = await queryRunner.getTable('observability_feedback');
      const evaluationCases = await queryRunner.getTable('evaluation_cases');
      const observabilityEvents = await queryRunner.getTable(
        'observability_events',
      );
      const encryptedContent = await readContentStorageRow(
        queryRunner,
        LEGACY_GENERATION_ID,
      );
      const promptRows = (await queryRunner.query(
        'SELECT "key", "enabled", "revision" FROM "prompt_policies" WHERE "key" = $1',
        ['rich-content-output'],
      )) as Array<{ enabled: boolean; key: string; revision: number }>;

      expect(promptPolicies?.findColumnByName('revision')).toBeDefined();
      expect(generations?.findColumnByName('responseModel')).toBeDefined();
      expect(generationContents?.findColumnByName('expiresAt')).toBeDefined();
      expect(generationContents?.findColumnByName('ciphertext')).toBeDefined();
      expect(generationContents?.findColumnByName('keyVersion')).toBeDefined();
      expect(encryptedContent).toEqual(
        expect.objectContaining({
          inputMessages: null,
          keyVersion: 'credential-derived-v1',
          outputText: null,
        }),
      );
      expect(typeof encryptedContent.authTag).toBe('string');
      expect(typeof encryptedContent.ciphertext).toBe('string');
      expect(typeof encryptedContent.initializationVector).toBe('string');
      expect(feedback?.uniques).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'UQ_observability_feedback_actor_metric',
          }),
        ]),
      );
      expect(feedback?.findColumnByName('reviewStatus')).toBeDefined();
      expect(
        evaluationCases?.findColumnByName('sourceFeedbackId'),
      ).toBeDefined();
      expect(evaluationCases?.uniques).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'UQ_evaluation_cases_source_feedback',
          }),
        ]),
      );
      expect(await queryRunner.hasTable('management_audit_logs')).toBe(true);
      expect(
        observabilityEvents?.findColumnByName('requestedModel'),
      ).toBeDefined();
      expect(promptRows).toEqual([
        { enabled: true, key: 'rich-content-output', revision: 1 },
      ]);
      expect(await queryRunner.hasTable('evaluation_suites')).toBe(true);
      expect(await queryRunner.hasTable('evaluation_metrics')).toBe(true);
      expect(await queryRunner.hasTable('evaluation_cases')).toBe(true);
      expect(await queryRunner.hasTable('evaluation_runs')).toBe(true);
      expect(await queryRunner.hasTable('evaluation_case_results')).toBe(true);
      expect(taskTable).toBeDefined();
      expect(taskTable?.findColumnByName('embeddingJson')?.type).toBe('jsonb');
      expect(memoryTable?.findColumnByName('idempotencyKey')).toBeDefined();
      expect(memoryTable?.findColumnByName('indexedAt')).toBeDefined();
      expect(vectorCollections).toBeDefined();
      expect(ingestionJobs?.findColumnByName('lockOwner')).toBeDefined();
      expect(ingestionJobs?.findColumnByName('lockedAt')).toBeDefined();
      expect(ingestionJobs?.findColumnByName('nextRunAt')).toBeDefined();
    } finally {
      await queryRunner.release();
    }

    await dataSource.undoLastMigration();
    const qualityP0RolledBack = dataSource.createQueryRunner();

    try {
      expect(
        await qualityP0RolledBack.hasTable('observability_generations'),
      ).toBe(true);
      expect(await qualityP0RolledBack.hasTable('prompt_policies')).toBe(true);
      expect(await qualityP0RolledBack.hasTable('management_audit_logs')).toBe(
        false,
      );
      const generationContents = await qualityP0RolledBack.getTable(
        'observability_generation_contents',
      );
      const feedback = await qualityP0RolledBack.getTable(
        'observability_feedback',
      );
      const evaluationCases =
        await qualityP0RolledBack.getTable('evaluation_cases');
      const observabilityEvents = await qualityP0RolledBack.getTable(
        'observability_events',
      );
      const restoredContent = await readContentStorageRow(
        qualityP0RolledBack,
        LEGACY_GENERATION_ID,
      );

      expect(
        observabilityEvents?.findColumnByName('requestedModel'),
      ).toBeDefined();
      expect(
        generationContents?.findColumnByName('ciphertext'),
      ).toBeUndefined();
      expect(
        generationContents?.findColumnByName('keyVersion'),
      ).toBeUndefined();
      expect(feedback?.findColumnByName('reviewStatus')).toBeUndefined();
      expect(
        evaluationCases?.findColumnByName('sourceFeedbackId'),
      ).toBeUndefined();
      expect(restoredContent.inputMessages).toEqual([
        { content: '旧版输入', role: 'user' },
      ]);
      expect(restoredContent.outputText).toBe('旧版输出');
      expect(restoredContent.ciphertext).toBeUndefined();
    } finally {
      await qualityP0RolledBack.release();
    }

    await dataSource.undoLastMigration();
    const generationObservabilityRolledBack = dataSource.createQueryRunner();

    try {
      expect(
        await generationObservabilityRolledBack.hasTable(
          'observability_generations',
        ),
      ).toBe(false);
      expect(
        await generationObservabilityRolledBack.hasTable('prompt_policies'),
      ).toBe(true);
      const observabilityEvents =
        await generationObservabilityRolledBack.getTable(
          'observability_events',
        );

      expect(
        observabilityEvents?.findColumnByName('requestedModel'),
      ).toBeUndefined();
    } finally {
      await generationObservabilityRolledBack.release();
    }

    await dataSource.undoLastMigration();
    const promptPoliciesRolledBack = dataSource.createQueryRunner();

    try {
      expect(await promptPoliciesRolledBack.hasTable('prompt_policies')).toBe(
        false,
      );
      expect(await promptPoliciesRolledBack.hasTable('evaluation_suites')).toBe(
        true,
      );
    } finally {
      await promptPoliciesRolledBack.release();
    }

    await dataSource.undoLastMigration();
    const evaluationRolledBack = dataSource.createQueryRunner();

    try {
      expect(await evaluationRolledBack.hasTable('evaluation_suites')).toBe(
        false,
      );
      expect(await evaluationRolledBack.hasTable('evaluation_metrics')).toBe(
        false,
      );
      expect(await evaluationRolledBack.hasTable('evaluation_cases')).toBe(
        false,
      );
      expect(await evaluationRolledBack.hasTable('evaluation_runs')).toBe(
        false,
      );
      expect(
        await evaluationRolledBack.hasTable('evaluation_case_results'),
      ).toBe(false);
      const ingestionJobs = await evaluationRolledBack.getTable(
        'knowledge_ingestion_jobs',
      );

      expect(ingestionJobs?.findColumnByName('lockOwner')).toBeDefined();
      expect(await evaluationRolledBack.hasTable('vector_collections')).toBe(
        true,
      );
    } finally {
      await evaluationRolledBack.release();
    }

    await dataSource.undoLastMigration();
    const ingestionRolledBack = dataSource.createQueryRunner();

    try {
      const ingestionJobs = await ingestionRolledBack.getTable(
        'knowledge_ingestion_jobs',
      );

      expect(ingestionJobs?.findColumnByName('lockOwner')).toBeUndefined();
      expect(await ingestionRolledBack.hasTable('vector_collections')).toBe(
        true,
      );
    } finally {
      await ingestionRolledBack.release();
    }

    await dataSource.undoLastMigration();
    const vectorRolledBack = dataSource.createQueryRunner();

    try {
      expect(await vectorRolledBack.hasTable('vector_collections')).toBe(false);
      expect(await vectorRolledBack.hasTable('agent_memory_tasks')).toBe(true);
    } finally {
      await vectorRolledBack.release();
    }

    await dataSource.undoLastMigration();
    const taskRolledBack = dataSource.createQueryRunner();

    try {
      expect(await taskRolledBack.hasTable('agent_memory_tasks')).toBe(false);
      const memoryTable = await taskRolledBack.getTable('agent_memories');

      expect(memoryTable?.findColumnByName('idempotencyKey')).toBeUndefined();
      expect(memoryTable?.findColumnByName('indexedAt')).toBeUndefined();
    } finally {
      await taskRolledBack.release();
    }

    await dataSource.runMigrations();
  });
});

async function assertInvalidEncryptedContentFailsClosed(
  app: INestApplication<Server>,
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
): Promise<void> {
  await insertGeneration(queryRunner, INVALID_GENERATION_ID);
  await queryRunner.query(
    `INSERT INTO "observability_generation_contents" (
       "generationId",
       "captureMode",
       "inputMessages",
       "outputText",
       "ciphertext",
       "initializationVector",
       "authTag",
       "keyVersion",
       "redactionCount",
       "truncated",
       "expiresAt"
     ) VALUES ($1, 'redacted', NULL, NULL, $2, $3, $4, $5, 0, false, NOW() + INTERVAL '1 day')`,
    [
      INVALID_GENERATION_ID,
      Buffer.from('invalid ciphertext').toString('base64'),
      Buffer.alloc(12, 1).toString('base64'),
      Buffer.alloc(16, 2).toString('base64'),
      'unavailable-key-v0',
    ],
  );

  await expect(
    app.get(ObservabilityContentMigrator).onApplicationBootstrap(),
  ).rejects.toMatchObject({ code: 'service_unavailable' });
  expect(
    await readContentStorageRow(queryRunner, INVALID_GENERATION_ID),
  ).toEqual(
    expect.objectContaining({
      inputMessages: null,
      keyVersion: 'unavailable-key-v0',
      outputText: null,
    }),
  );

  await queryRunner.query(
    'DELETE FROM "observability_generations" WHERE "id" = $1',
    [INVALID_GENERATION_ID],
  );
}

async function insertLegacyObservabilityContent(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
): Promise<void> {
  await insertGeneration(queryRunner, LEGACY_GENERATION_ID);
  await queryRunner.query(
    `INSERT INTO "observability_generation_contents" (
       "generationId",
       "captureMode",
       "inputMessages",
       "outputText",
       "redactionCount",
       "truncated",
       "expiresAt"
     ) VALUES ($1, 'redacted', $2::jsonb, $3, 0, false, NOW() + INTERVAL '1 day')`,
    [
      LEGACY_GENERATION_ID,
      JSON.stringify([{ content: '旧版输入', role: 'user' }]),
      '旧版输出',
    ],
  );
}

async function insertGeneration(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
  generationId: string,
): Promise<void> {
  await queryRunner.query(
    `INSERT INTO "observability_generations" (
       "id",
       "traceId",
       "agentId",
       "source",
       "providerId",
       "providerName",
       "requestedModel",
       "finishReasons",
       "configuration",
       "status",
       "startedAt",
       "completedAt"
     ) VALUES ($1, $2, 'migration-agent', 'admin', 'migration-provider', '迁移供应商', 'migration-model', '[]'::jsonb, '{}'::jsonb, 'completed', NOW(), NOW())`,
    [generationId, `trace-${generationId}`],
  );
}

async function readContentStorageRow(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
  generationId: string,
): Promise<ContentStorageRow> {
  const rows = (await queryRunner.query(
    'SELECT * FROM "observability_generation_contents" WHERE "generationId" = $1',
    [generationId],
  )) as ContentStorageRow[];
  const row = rows[0];

  if (!row) {
    throw new Error(`Missing observability content fixture ${generationId}.`);
  }

  return row;
}
