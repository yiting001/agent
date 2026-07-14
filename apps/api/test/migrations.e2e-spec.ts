import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { AgentMemoryTaskScheduler } from '../src/modules/agent-memory/infrastructure/agent-memory-task.scheduler';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';

describe('Database migrations', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    process.env.DATABASE_MIGRATIONS_RUN = 'true';
    process.env.DATABASE_PATH = ':memory:';
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
      .expect(200)
      .expect((response) => {
        expect(response.text).toContain('"goldenSignals"');
        expect(response.text).toContain('"recentTraces"');
        expect(response.text).toContain('"usage"');
      });
  });

  it('migrates and rolls back the agent memory task schema', async () => {
    const dataSource = app.get(DataSource);
    const queryRunner = dataSource.createQueryRunner();

    try {
      const taskTable = await queryRunner.getTable('agent_memory_tasks');
      const memoryTable = await queryRunner.getTable('agent_memories');

      expect(taskTable).toBeDefined();
      expect(taskTable?.findColumnByName('embeddingJson')).toBeDefined();
      expect(memoryTable?.findColumnByName('idempotencyKey')).toBeDefined();
      expect(memoryTable?.findColumnByName('indexedAt')).toBeDefined();
    } finally {
      await queryRunner.release();
    }

    await dataSource.undoLastMigration();
    const rolledBack = dataSource.createQueryRunner();

    try {
      expect(await rolledBack.hasTable('agent_memory_tasks')).toBe(false);
      const memoryTable = await rolledBack.getTable('agent_memories');

      expect(memoryTable?.findColumnByName('idempotencyKey')).toBeUndefined();
      expect(memoryTable?.findColumnByName('indexedAt')).toBeUndefined();
    } finally {
      await rolledBack.release();
    }

    await dataSource.runMigrations();
  });
});
