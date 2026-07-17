import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

import { issueMemoryOwner } from './agent-memory-test-helpers';
import { parseRecord, readArray, readString } from './knowledge-test-app';
import { MANAGEMENT_TEST_AUTHORIZATION } from './management-test-credentials';

export interface FeedbackFixture {
  feedbackId: string;
  generationId: string;
  ownerToken: string;
  traceId: string;
}

interface FeedbackConversionBody {
  evaluationCriteria: string;
  expectedKeywords: string[];
  expectedOutput: string;
  input: string;
  suiteId: string;
  tags: string[];
}

export async function createAgent(
  app: INestApplication<Server>,
  providerId: string,
  name: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/agents')
    .send({
      description: '观测质量闭环 P0 E2E',
      moduleIds: [],
      name,
      providerId,
      systemPrompt: '请准确回答。',
      temperature: 0.2,
    })
    .expect(201);

  return readString(parseRecord(response.text), 'id');
}

export async function createSuite(
  app: INestApplication<Server>,
  agentId: string,
  name: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/evaluation-suites')
    .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
    .send({
      agentId,
      cases: [{ expectedKeywords: ['基准'], input: '基准问题' }],
      description: '质量闭环转换目标',
      metrics: [
        {
          name: '关键词命中率',
          passingThreshold: 1,
          weight: 1,
        },
      ],
      name,
    })
    .expect(201);

  return readString(parseRecord(response.text), 'id');
}

export async function createFeedback(
  app: INestApplication<Server>,
  agentId: string,
  rating: 'negative' | 'positive',
): Promise<FeedbackFixture> {
  const { ownerToken } = await issueMemoryOwner(app);
  const chat = await request(app.getHttpServer())
    .post(`/api/agents/${agentId}/chat`)
    .send({
      memoryOwnerToken: ownerToken,
      messages: [{ content: '质量闭环测试输入', role: 'user' }],
    })
    .expect(200);
  const metadataMatch = chat.text.match(/event: metadata\r?\ndata: ([^\r\n]+)/);

  if (!metadataMatch?.[1]) {
    throw new Error('Expected generation metadata.');
  }

  const metadata = parseRecord(metadataMatch[1]);
  const generationId = readString(metadata, 'generationId');
  const feedbackId = await submitFeedback(
    app,
    agentId,
    generationId,
    ownerToken,
    rating,
  );

  return {
    feedbackId,
    generationId,
    ownerToken,
    traceId: readString(metadata, 'traceId'),
  };
}

export async function submitFeedback(
  app: INestApplication<Server>,
  agentId: string,
  generationId: string,
  ownerToken: string,
  rating: 'negative' | 'positive',
): Promise<string> {
  const response = await request(app.getHttpServer())
    .put(`/api/agents/${agentId}/generations/${generationId}/feedback`)
    .send({
      comment: rating === 'negative' ? '需要人工复核' : undefined,
      memoryOwnerToken: ownerToken,
      rating,
      reasonCodes: rating === 'negative' ? ['incorrect'] : [],
    })
    .expect(200);

  return readString(parseRecord(response.text), 'id');
}

export async function findPendingReview(
  app: INestApplication<Server>,
  feedbackId: string,
): Promise<Record<string, unknown>> {
  const response = await request(app.getHttpServer())
    .get(
      '/api/observability/feedback-reviews?status=pending&page=1&pageSize=100',
    )
    .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
    .expect(200);
  const page = parseRecord(response.text);
  const item = readArray(page, 'items').find(
    (candidate) =>
      typeof candidate === 'object' &&
      candidate !== null &&
      'feedbackId' in candidate &&
      candidate.feedbackId === feedbackId,
  );

  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw new Error('Expected pending feedback review.');
  }

  return item as Record<string, unknown>;
}

export function conversionBody(suiteId: string): FeedbackConversionBody {
  return {
    evaluationCriteria: '回答必须与事实一致',
    expectedKeywords: ['正确', '事实'],
    expectedOutput: '正确答案',
    input: '脱敏后的问题',
    suiteId,
    tags: ['线上反馈', '事实性'],
  };
}
