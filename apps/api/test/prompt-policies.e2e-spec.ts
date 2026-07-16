import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';

import type { PromptPolicyEntity } from '../src/modules/prompt-policies/infrastructure/prompt-policy.entity';
import type { ChatCompletionInput } from '../src/modules/model-providers/application/model-gateway';
import {
  createKnowledgeTestApp,
  parseRecord,
  readString,
} from './knowledge-test-app';

describe('Prompt policies', () => {
  const policyId = '7ce8c761-0f05-4cf6-9e20-45e965243f36';
  const storagePath = resolve('.test-data/prompt-policies');
  const observedChatInputs: ChatCompletionInput[] = [];
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await createKnowledgeTestApp(storagePath, (input) =>
      observedChatInputs.push(input),
    );
    const dataSource = app.get(DataSource);

    await dataSource.getRepository<PromptPolicyEntity>('prompt_policies').save({
      category: 'output',
      content: '默认输出安全 HTML。',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      description: '输出协议',
      enabled: true,
      id: policyId,
      key: 'rich-content-output',
      name: '富内容 HTML 输出',
      priority: 100,
      revision: 1,
      source: 'builtin',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);

    await dataSource
      .getRepository<PromptPolicyEntity>('prompt_policies')
      .delete(policyId);
    await app.close();
  });

  it('lists, updates and injects enabled policies into agent chat', async () => {
    await request(app.getHttpServer())
      .get('/api/prompt-policies')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toContainEqual(
          expect.objectContaining({
            id: policyId,
            key: 'rich-content-output',
            revision: 1,
          }),
        );
      });

    await request(app.getHttpServer())
      .put(`/api/prompt-policies/${policyId}`)
      .send({
        content: '优先输出语义化 HTML，并使用结构化图表。',
        description: '安全富内容协议',
        enabled: true,
        expectedRevision: 1,
        name: '富内容输出规范',
        priority: 80,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            content: '优先输出语义化 HTML，并使用结构化图表。',
            revision: 2,
          }),
        );
      });

    await request(app.getHttpServer())
      .put(`/api/prompt-policies/${policyId}`)
      .send({
        content: '过期编辑',
        description: '',
        enabled: true,
        expectedRevision: 1,
        name: '过期编辑',
        priority: 100,
      })
      .expect(409);

    const providerResponse = await request(app.getHttpServer())
      .put('/api/model-providers/prompt-policy-provider')
      .send({
        apiKey: 'prompt-policy-key',
        baseUrl: 'http://model.test/v1',
        chatModel: 'chat-model',
        description: '提示词测试模型',
        name: '提示词测试模型',
      })
      .expect(200);
    const providerId = readString(parseRecord(providerResponse.text), 'id');
    const agentResponse = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        description: '验证内置策略注入',
        moduleIds: [],
        name: '提示词策略助手',
        providerId,
        skillIds: [],
        systemPrompt: '请回答问题。',
        temperature: 0.2,
      })
      .expect(201);
    const agentId = readString(parseRecord(agentResponse.text), 'id');

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        messages: [{ content: '生成一份报表。', role: 'user' }],
      })
      .expect(200);

    expect(observedChatInputs.at(-1)?.messages[0]?.content).toContain(
      '优先输出语义化 HTML，并使用结构化图表。',
    );
    expect(observedChatInputs.at(-1)?.messages[0]?.content).toContain(
      '以下是管理员启用的系统策略',
    );

    await request(app.getHttpServer())
      .put(`/api/prompt-policies/${policyId}`)
      .send({
        content: '优先输出语义化 HTML，并使用结构化图表。',
        description: '安全富内容协议',
        enabled: false,
        expectedRevision: 2,
        name: '富内容输出规范',
        priority: 80,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        messages: [{ content: '再次生成报表。', role: 'user' }],
      })
      .expect(200);

    expect(observedChatInputs.at(-1)?.messages[0]?.content).not.toContain(
      '优先输出语义化 HTML，并使用结构化图表。',
    );
  });
});
