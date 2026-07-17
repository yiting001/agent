import type { INestApplication } from '@nestjs/common';
import { promises as fileSystem } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import request, { type Response } from 'supertest';

import { issueMemoryOwner } from './agent-memory-test-helpers';
import {
  createKnowledgeTestApp,
  parseRecord,
  readString,
} from './knowledge-test-app';
import { MANAGEMENT_TEST_AUTHORIZATION } from './management-test-credentials';

describe('Generation observability feedback', () => {
  const storagePath = resolve('.test-data/observability-feedback');
  let agentId = '';
  let app: INestApplication<Server>;
  let otherAgentId = '';

  beforeAll(async () => {
    app = await createKnowledgeTestApp(storagePath);
    const providerResponse = await request(app.getHttpServer())
      .put('/api/model-providers/feedback-provider')
      .send({
        apiKey: 'test-key',
        baseUrl: 'http://model.test/v1',
        chatModel: 'requested-model',
        description: '反馈测试模型',
        embeddingModel: 'embedding-model',
        name: '反馈测试供应商',
      })
      .expect(200);
    const providerId = readString(parseRecord(providerResponse.text), 'id');

    agentId = await createAgent(app, providerId, '反馈测试智能体');
    otherAgentId = await createAgent(app, providerId, '其他智能体');
  });

  afterAll(async () => {
    await app.close();
    await fileSystem.rm(storagePath, { force: true, recursive: true });
  });

  it('返回 generation metadata 并按匿名主体幂等更新反馈', async () => {
    const { ownerToken } = await issueMemoryOwner(app);
    const { ownerToken: otherOwnerToken } = await issueMemoryOwner(app);
    const feedbackChat = await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        memoryOwnerToken: ownerToken,
        messages: [{ content: '需要反馈的回答', role: 'user' }],
      })
      .expect('Content-Type', /text\/event-stream/)
      .expect(200);
    const metadataMatch = feedbackChat.text.match(
      /event: metadata\r?\ndata: ([^\r\n]+)/,
    );

    if (!metadataMatch?.[1]) {
      throw new Error('Expected generation metadata in chat stream.');
    }

    const metadata = parseRecord(metadataMatch[1]);
    const generationId = readString(metadata, 'generationId');
    const traceId = readString(metadata, 'traceId');
    const positiveFeedback = await request(app.getHttpServer())
      .put(`/api/agents/${agentId}/generations/${generationId}/feedback`)
      .send({
        memoryOwnerToken: ownerToken,
        rating: 'positive',
        reasonCodes: [],
      })
      .expect(200);
    const feedbackId = readString(parseRecord(positiveFeedback.text), 'id');

    await request(app.getHttpServer())
      .put(`/api/agents/${agentId}/generations/${generationId}/feedback`)
      .send({
        comment: 'api_key=should-not-be-stored',
        memoryOwnerToken: ownerToken,
        rating: 'negative',
        reasonCodes: ['incorrect', 'citation'],
      })
      .expect(200)
      .expect(({ text }) => {
        const feedback = parseRecord(text);

        expect(readString(feedback, 'id')).toBe(feedbackId);
        expect(readString(feedback, 'rating')).toBe('negative');
        expect(text).not.toContain('should-not-be-stored');
      });

    await expectFeedbackFailure(
      app,
      agentId,
      generationId,
      {
        memoryOwnerToken: otherOwnerToken,
        rating: 'positive',
        reasonCodes: [],
      },
      401,
    );
    await expectFeedbackFailure(
      app,
      otherAgentId,
      generationId,
      {
        memoryOwnerToken: ownerToken,
        rating: 'positive',
        reasonCodes: [],
      },
      404,
    );
    await expectFeedbackFailure(
      app,
      agentId,
      'missing',
      {
        memoryOwnerToken: ownerToken,
        rating: 'positive',
        reasonCodes: [],
      },
      404,
    );
    await expectFeedbackFailure(
      app,
      agentId,
      generationId,
      {
        memoryOwnerToken: `${ownerToken}invalid`,
        rating: 'positive',
        reasonCodes: [],
      },
      401,
    );

    await request(app.getHttpServer())
      .get(`/api/observability/traces/${traceId}`)
      .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('"captureMode":"redacted"');
        expect(text).toContain('需要反馈的回答');
        expect(text).toContain('真实模型回答');
        expect(text).toContain('"rating":"negative"');
        expect(text).not.toContain('should-not-be-stored');
      });
  });

  it('校验反馈枚举和评论长度', async () => {
    const { ownerToken } = await issueMemoryOwner(app);

    await expectFeedbackFailure(
      app,
      agentId,
      'missing',
      {
        memoryOwnerToken: ownerToken,
        rating: 'negative',
        reasonCodes: ['unsupported'],
      },
      400,
    );
    await expectFeedbackFailure(
      app,
      agentId,
      'missing',
      {
        comment: 'x'.repeat(1_001),
        memoryOwnerToken: ownerToken,
        rating: 'negative',
        reasonCodes: ['other'],
      },
      400,
    );
  });
});

async function createAgent(
  app: INestApplication<Server>,
  providerId: string,
  name: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/agents')
    .send({
      description: '观测反馈 E2E',
      moduleIds: [],
      name,
      providerId,
      systemPrompt: '请回答用户。',
      temperature: 0.2,
    })
    .expect(201);

  return readString(parseRecord(response.text), 'id');
}

function expectFeedbackFailure(
  app: INestApplication<Server>,
  targetAgentId: string,
  generationId: string,
  body: Record<string, unknown>,
  status: number,
): Promise<Response> {
  return request(app.getHttpServer())
    .put(`/api/agents/${targetAgentId}/generations/${generationId}/feedback`)
    .send(body)
    .expect(status);
}
