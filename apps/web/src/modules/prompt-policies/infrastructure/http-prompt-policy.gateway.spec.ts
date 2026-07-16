import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@/shared/http/http-client';

import type {
  PromptPolicy,
  UpdatePromptPolicyInput,
} from '../domain/prompt-policy';
import { HttpPromptPolicyGateway } from './http-prompt-policy.gateway';

function policy(): PromptPolicy {
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
  };
}

class PromptHttpClient implements Pick<HttpClient, 'get' | 'put'> {
  readonly requests: Array<{ body?: unknown; path: string }> = [];
  response: unknown = [];

  get<Response>(path: string): Promise<Response> {
    this.requests.push({ path });
    return Promise.resolve(this.response as Response);
  }

  put<Response, Body>(path: string, body: Body): Promise<Response> {
    this.requests.push({ body, path });
    return Promise.resolve(this.response as Response);
  }
}

describe('HttpPromptPolicyGateway', () => {
  it('uses prompt policy list and update endpoints', async () => {
    const client = new PromptHttpClient();
    const gateway = new HttpPromptPolicyGateway(client);
    const input: UpdatePromptPolicyInput = {
      content: '输出安全 HTML。',
      description: '输出协议',
      enabled: true,
      expectedRevision: 1,
      name: '富内容输出',
      priority: 100,
    };

    client.response = [policy()];
    await expect(gateway.list()).resolves.toEqual([policy()]);

    client.response = policy();
    await expect(gateway.update('policy-id', input)).resolves.toEqual(policy());
    expect(client.requests).toEqual([
      { path: '/prompt-policies' },
      { body: input, path: '/prompt-policies/policy-id' },
    ]);
  });
});
