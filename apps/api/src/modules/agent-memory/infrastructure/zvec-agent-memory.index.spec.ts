import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ApplicationConfig } from '../../../config/application.config';
import { ZvecAgentMemoryIndex } from './zvec-agent-memory.index';

function createConfig(dataPath: string): ConfigService {
  return {
    getOrThrow: () =>
      ({
        agentMemoryZvecCollectionPrefix: 'test_agent_memory',
        zvecDataPath: dataPath,
        zvecIndexType: 'hnsw',
      }) as ApplicationConfig,
  } as unknown as ConfigService;
}

describe('ZvecAgentMemoryIndex', () => {
  const dataPaths: string[] = [];

  afterEach(() => {
    for (const dataPath of dataPaths.splice(0)) {
      rmSync(dataPath, { force: true, recursive: true });
    }
  });

  it('persists image episodes and keeps owners isolated', async () => {
    const dataPath = resolve('.test-data', `agent-memory-${randomUUID()}`);
    const index = new ZvecAgentMemoryIndex(createConfig(dataPath));
    const agentId = randomUUID();
    const firstMemoryId = randomUUID();
    const secondMemoryId = randomUUID();

    dataPaths.push(dataPath);
    await index.upsert(3, [
      {
        agentId,
        content: '情景摘要：公园里的柯基犬',
        memoryId: firstMemoryId,
        ownerKey: 'owner-a',
        vector: [1, 0, 0],
      },
      {
        agentId,
        content: '情景摘要：海边的拉布拉多犬',
        memoryId: secondMemoryId,
        ownerKey: 'owner-b',
        vector: [1, 0, 0],
      },
    ]);
    index.onApplicationShutdown();

    const reopened = new ZvecAgentMemoryIndex(createConfig(dataPath));
    const ownerResults = await reopened.search({
      agentId,
      dimensions: 3,
      limit: 5,
      ownerKey: 'owner-a',
      vector: [1, 0, 0],
    });

    expect(ownerResults).toEqual([
      expect.objectContaining({
        content: '情景摘要：公园里的柯基犬',
        memoryId: firstMemoryId,
      }),
    ]);

    await reopened.delete([firstMemoryId]);
    expect(
      await reopened.search({
        agentId,
        dimensions: 3,
        limit: 5,
        ownerKey: 'owner-a',
        vector: [1, 0, 0],
      }),
    ).toEqual([]);
    reopened.onApplicationShutdown();
  });
});
