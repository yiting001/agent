import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ApplicationConfig } from '../../../../config/application.config';
import type { KnowledgeBase } from '../../domain/knowledge';
import { ZvecVectorIndex } from './zvec-vector.index';

function createConfig(dataPath: string): ConfigService {
  return {
    getOrThrow: () =>
      ({
        zvecCollectionPrefix: 'test_knowledge',
        zvecDataPath: dataPath,
        zvecIndexType: 'hnsw',
        zvecUpsertBatchSize: 1,
      }) as ApplicationConfig,
  } as unknown as ConfigService;
}

function createKnowledgeBase(): KnowledgeBase {
  const now = new Date();

  return {
    createdAt: now,
    description: '测试知识库',
    embeddingDimensions: 3,
    embeddingModel: 'embedding-model',
    embeddingProviderId: randomUUID(),
    id: randomUUID(),
    name: '测试知识库',
    updatedAt: now,
  };
}

describe('ZvecVectorIndex', () => {
  const dataPaths: string[] = [];

  afterEach(() => {
    for (const dataPath of dataPaths.splice(0)) {
      rmSync(dataPath, { force: true, recursive: true });
    }
  });

  it('persists vectors and filters results by shared module', async () => {
    const dataPath = resolve('.test-data', `zvec-${randomUUID()}`);
    const config = createConfig(dataPath);
    const knowledgeBase = createKnowledgeBase();
    const moduleId = randomUUID();
    const otherModuleId = randomUUID();
    const index = new ZvecVectorIndex(config);

    dataPaths.push(dataPath);
    await index.ensureCollection(knowledgeBase);
    await index.upsert(knowledgeBase, [
      {
        chunkIndex: 0,
        content: '产品资料内容',
        documentId: randomUUID(),
        fileName: '产品.txt',
        id: randomUUID(),
        moduleId,
        vector: [1, 0, 0],
      },
      {
        chunkIndex: 0,
        content: '售后资料内容',
        documentId: randomUUID(),
        fileName: '售后.txt',
        id: randomUUID(),
        moduleId: otherModuleId,
        vector: [1, 0, 0],
      },
    ]);
    index.onApplicationShutdown();

    const reopenedIndex = new ZvecVectorIndex(config);
    const results = await reopenedIndex.search(
      knowledgeBase,
      [moduleId],
      [1, 0, 0],
      5,
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      content: '产品资料内容',
      fileName: '产品.txt',
      moduleId,
    });
    reopenedIndex.onApplicationShutdown();
  });
});
