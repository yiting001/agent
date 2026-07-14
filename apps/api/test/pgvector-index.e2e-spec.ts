import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { AgentMemoryIndex } from '../src/modules/agent-memory/application/agent-memory.index';
import { AgentMemoryTaskScheduler } from '../src/modules/agent-memory/infrastructure/agent-memory-task.scheduler';
import { VectorIndex } from '../src/modules/knowledge/application/vector-index';
import type { KnowledgeBase } from '../src/modules/knowledge/domain/knowledge';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';

describe('PostgreSQL pgvector indexes', () => {
  let agentMemoryIndex: AgentMemoryIndex;
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let vectorIndex: VectorIndex;

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
    await app.init();
    agentMemoryIndex = app.get(AgentMemoryIndex);
    dataSource = app.get(DataSource);
    vectorIndex = app.get(VectorIndex);
  });

  afterAll(async () => {
    await app.close();
  });

  it('upserts, filters, searches and deletes knowledge vectors', async () => {
    const now = new Date();
    const knowledgeBase: KnowledgeBase = {
      createdAt: now,
      description: '',
      embeddingDimensions: 3,
      embeddingModel: 'test-model',
      embeddingProviderId: 'provider-id',
      id: 'knowledge-base-id',
      name: '测试知识库',
      updatedAt: now,
    };

    await vectorIndex.upsert(knowledgeBase, [
      {
        chunkIndex: 0,
        content: '模块一内容',
        documentId: 'document-one',
        fileName: 'one.txt',
        id: 'point-one',
        moduleId: 'module-one',
        vector: [1, 0, 0],
      },
      {
        chunkIndex: 0,
        content: '模块二内容',
        documentId: 'document-two',
        fileName: 'two.txt',
        id: 'point-two',
        moduleId: 'module-two',
        vector: [0, 1, 0],
      },
    ]);

    await expect(
      vectorIndex.search(knowledgeBase, ['module-one'], [1, 0, 0], 5),
    ).resolves.toEqual([
      expect.objectContaining({
        content: '模块一内容',
        documentId: 'document-one',
        moduleId: 'module-one',
      }),
    ]);

    await vectorIndex.deleteDocuments(knowledgeBase, ['document-one']);
    await expect(
      vectorIndex.search(knowledgeBase, ['module-one'], [1, 0, 0], 5),
    ).resolves.toEqual([]);
    await vectorIndex.dropCollection(knowledgeBase);
    await expect(
      vectorIndex.search(knowledgeBase, ['module-two'], [0, 1, 0], 5),
    ).resolves.toEqual([]);
  });

  it('keeps agent memory vectors isolated by agent and owner', async () => {
    await agentMemoryIndex.upsert(3, [
      {
        agentId: 'agent-one',
        content: '主人在公园见到一只柯基',
        memoryId: 'memory-one',
        ownerKey: 'owner-one',
        vector: [1, 0, 0],
      },
      {
        agentId: 'agent-one',
        content: '其他用户的图片记忆',
        memoryId: 'memory-two',
        ownerKey: 'owner-two',
        vector: [1, 0, 0],
      },
    ]);

    await expect(
      agentMemoryIndex.search({
        agentId: 'agent-one',
        dimensions: 3,
        limit: 5,
        ownerKey: 'owner-one',
        vector: [1, 0, 0],
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        memoryId: 'memory-one',
      }),
    ]);
    await expect(agentMemoryIndex.exists('memory-one')).resolves.toBe(true);

    await agentMemoryIndex.clear('agent-one', 'owner-one');
    await expect(agentMemoryIndex.exists('memory-one')).resolves.toBe(false);
    await expect(agentMemoryIndex.exists('memory-two')).resolves.toBe(true);

    await agentMemoryIndex.delete(['memory-two']);
    await expect(agentMemoryIndex.exists('memory-two')).resolves.toBe(false);
  });

  it('creates halfvec storage above 2000 dimensions', async () => {
    const now = new Date();
    const knowledgeBase: KnowledgeBase = {
      createdAt: now,
      description: '',
      embeddingDimensions: 2_001,
      embeddingModel: 'large-test-model',
      embeddingProviderId: 'provider-id',
      id: 'large-knowledge-base-id',
      name: '高维知识库',
      updatedAt: now,
    };

    await vectorIndex.ensureCollection(knowledgeBase);
    const rows: unknown = await dataSource.query(`
      SELECT format_type(attribute.atttypid, attribute.atttypmod) AS "type"
      FROM pg_attribute AS attribute
      WHERE attribute.attrelid = 'knowledge_vectors_d2001'::regclass
        AND attribute.attname = 'embedding'
    `);

    expect(rows).toEqual([{ type: 'halfvec(2001)' }]);
  });

  it('recreates a registered vector table when storage is missing', async () => {
    const now = new Date();
    const knowledgeBase: KnowledgeBase = {
      createdAt: now,
      description: '',
      embeddingDimensions: 3,
      embeddingModel: 'test-model',
      embeddingProviderId: 'provider-id',
      id: 'repair-knowledge-base-id',
      name: '修复知识库',
      updatedAt: now,
    };

    await dataSource.query('DROP TABLE "knowledge_vectors_d3"');
    await vectorIndex.ensureCollection(knowledgeBase);
    const rows: unknown = await dataSource.query(
      `SELECT to_regclass('knowledge_vectors_d3') AS "tableName"`,
    );

    expect(rows).toEqual([{ tableName: 'knowledge_vectors_d3' }]);
  });
});
