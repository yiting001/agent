import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@/shared/http/http-client';

import { HttpKnowledgeEntryGateway } from './http-knowledge-entry.gateway';

const entry = {
  content: '领域层不得依赖框架。',
  createdAt: '2026-01-01T00:00:00.000Z',
  id: 'entry-1',
  tags: ['架构'],
  title: 'DDD 分层约定',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function stubHttpClient(overrides: Partial<HttpClient>): HttpClient {
  const reject = (): Promise<never> =>
    Promise.reject(new Error('Unexpected HTTP call.'));

  return {
    delete: reject,
    get: reject,
    post: reject,
    put: reject,
    ...overrides,
  };
}

describe('HttpKnowledgeEntryGateway', () => {
  it('returns validated entries from the list endpoint', async () => {
    const gateway = new HttpKnowledgeEntryGateway(
      stubHttpClient({ get: () => Promise.resolve([entry]) }),
    );

    await expect(gateway.list()).resolves.toEqual([entry]);
  });

  it('rejects list payloads that break the entry contract', async () => {
    const gateway = new HttpKnowledgeEntryGateway(
      stubHttpClient({ get: () => Promise.resolve([{ id: 1 }]) }),
    );

    await expect(gateway.list()).rejects.toThrow(
      'The knowledge API returned an invalid entry.',
    );
  });

  it('returns the created entry from the create endpoint', async () => {
    const gateway = new HttpKnowledgeEntryGateway(
      stubHttpClient({ post: () => Promise.resolve(entry) }),
    );

    await expect(
      gateway.create({
        content: entry.content,
        tags: entry.tags,
        title: entry.title,
      }),
    ).resolves.toEqual(entry);
  });
});
