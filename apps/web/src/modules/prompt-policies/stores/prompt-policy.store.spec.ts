import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { applicationDependencies } from '@/app/dependencies';

import type { PromptPolicy } from '../domain/prompt-policy';
import { usePromptPolicyStore } from './prompt-policy.store';

function policy(overrides: Partial<PromptPolicy> = {}): PromptPolicy {
  return {
    category: 'output',
    content: '输出安全 HTML。',
    createdAt: '2026-01-01T00:00:00.000Z',
    description: '输出协议',
    enabled: true,
    id: 'policy-id',
    key: 'rich-content-output',
    name: '富内容输出',
    priority: 100,
    revision: 1,
    source: 'builtin',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('usePromptPolicyStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads policies and replaces the saved revision locally', async () => {
    setActivePinia(createPinia());
    const gateway = applicationDependencies.promptPolicyGateway;
    const initial = policy();
    const updated = policy({
      content: '更新后的安全 HTML 协议。',
      revision: 2,
    });

    vi.spyOn(gateway, 'list').mockResolvedValue([initial]);
    vi.spyOn(gateway, 'update').mockResolvedValue(updated);
    const store = usePromptPolicyStore();

    await store.load();
    await store.update(initial.id, {
      content: updated.content,
      description: initial.description,
      enabled: true,
      expectedRevision: 1,
      name: initial.name,
      priority: 100,
    });

    expect(store.policies).toEqual([updated]);
    expect(store.successMessage).toContain('下一次对话');
    expect(store.savingId).toBe('');
  });

  it('exposes optimistic lock failures for refresh and retry', async () => {
    setActivePinia(createPinia());
    const gateway = applicationDependencies.promptPolicyGateway;
    const failure = new Error('提示词已被其他管理员更新，请刷新后重试。');

    vi.spyOn(gateway, 'update').mockRejectedValue(failure);
    const store = usePromptPolicyStore();

    await expect(
      store.update('policy-id', {
        content: '过期内容',
        description: '',
        enabled: true,
        expectedRevision: 1,
        name: '过期提示词',
        priority: 100,
      }),
    ).rejects.toBe(failure);
    expect(store.error).toContain('刷新后重试');
  });
});
