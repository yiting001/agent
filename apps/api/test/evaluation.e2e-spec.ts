import type { INestApplication } from '@nestjs/common';
import { promises as fileSystem } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import request from 'supertest';

import {
  createKnowledgeTestApp,
  parseRecord,
  readString,
} from './knowledge-test-app';

function readNumber(value: Record<string, unknown>, property: string): number {
  const result = value[property];

  if (typeof result !== 'number') {
    throw new Error(`Expected ${property} to be a number.`);
  }

  return result;
}

describe('Evaluation', () => {
  const storagePath = resolve('.test-data/evaluation');
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await createKnowledgeTestApp(storagePath);
  });

  afterAll(async () => {
    await app.close();
    await fileSystem.rm(storagePath, { force: true, recursive: true });
  });

  it('creates an evaluation suite and stores benchmark run results', async () => {
    const providerResponse = await request(app.getHttpServer())
      .put('/api/model-providers/evaluation-provider')
      .send({
        apiKey: 'evaluation-key',
        baseUrl: 'http://model.test/v1',
        chatModel: 'chat-model',
        description: '评估测试模型',
        name: '评估模型',
      })
      .expect(200);
    const providerId = readString(parseRecord(providerResponse.text), 'id');

    const agentResponse = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        description: '评估目标助手',
        moduleIds: [],
        name: '评估助手',
        providerId,
        skillIds: [],
        systemPrompt: '请严谨回答。',
        temperature: 0.2,
      })
      .expect(201);
    const agentId = readString(parseRecord(agentResponse.text), 'id');

    const suiteResponse = await request(app.getHttpServer())
      .post('/api/evaluation-suites')
      .send({
        agentId,
        cases: [
          {
            expectedKeywords: ['真实', '模型回答'],
            input: '请回答基准问题。',
          },
        ],
        description: '覆盖基础回答质量。',
        metrics: [
          {
            name: '关键词命中率',
            passingThreshold: 1,
            weight: 1,
          },
        ],
        name: '基础评估集',
      })
      .expect(201);
    const suiteId = readString(parseRecord(suiteResponse.text), 'id');

    await request(app.getHttpServer())
      .get('/api/evaluation-suites')
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain(suiteId);
      });

    const runResponse = await request(app.getHttpServer())
      .post(`/api/evaluation-suites/${suiteId}/runs`)
      .send({})
      .expect(201);
    const run = parseRecord(runResponse.text);
    const runId = readString(run, 'id');

    expect(readNumber(run, 'score')).toBe(1);
    expect(runResponse.text).toContain('真实模型回答');
    expect(runResponse.text).not.toContain('evaluation-key');

    await request(app.getHttpServer())
      .get('/api/agents')
      .expect(200)
      .expect(({ text }) => {
        const agents: unknown = JSON.parse(text);

        if (!Array.isArray(agents)) {
          throw new Error('Expected agent list response.');
        }

        expect(agents).toContainEqual(
          expect.objectContaining({
            conversationCount: 0,
            id: agentId,
          }),
        );
      });

    await request(app.getHttpServer())
      .get(`/api/evaluation-runs/${runId}`)
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('matchedKeywords');
        expect(text).not.toContain('evaluation-key');
      });
  });
});
