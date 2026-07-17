import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { promises as fileSystem } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';

import {
  createKnowledgeTestApp,
  parseRecord,
  readString,
} from './knowledge-test-app';
import {
  MANAGEMENT_TEST_AUTHORIZATION,
  MANAGEMENT_TEST_TOKENS,
} from './management-test-credentials';
import {
  conversionBody,
  createAgent,
  createFeedback,
  createSuite,
  findPendingReview,
  submitFeedback,
} from './observability-quality-p0-test-helpers';

describe('Observability quality P0', () => {
  const storagePath = resolve('.test-data/observability-quality-p0');
  let agentId = '';
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let otherAgentId = '';
  let otherSuiteId = '';
  let suiteId = '';

  beforeAll(async () => {
    app = await createKnowledgeTestApp(storagePath);
    dataSource = app.get(DataSource);
    const providerResponse = await request(app.getHttpServer())
      .put('/api/model-providers/quality-p0-provider')
      .send({
        apiKey: 'quality-p0-key',
        baseUrl: 'http://model.test/v1',
        chatModel: 'quality-model',
        description: '质量闭环测试模型',
        name: '质量闭环供应商',
      })
      .expect(200);
    const providerId = readString(parseRecord(providerResponse.text), 'id');

    agentId = await createAgent(app, providerId, '质量闭环智能体');
    otherAgentId = await createAgent(app, providerId, '隔离智能体');
    suiteId = await createSuite(app, agentId, '质量闭环评估集');
    otherSuiteId = await createSuite(app, otherAgentId, '隔离评估集');
  });

  afterAll(async () => {
    await app.close();
    await fileSystem.rm(storagePath, { force: true, recursive: true });
  });

  it('enforces management scopes and audits decrypted content views', async () => {
    await request(app.getHttpServer())
      .get('/api/management-access/session')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/management-access/session')
      .set('Authorization', `Bearer ${MANAGEMENT_TEST_TOKENS.metrics}`)
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('metrics-operator');
        expect(text).toContain('observability:metrics');
      });
    await request(app.getHttpServer())
      .get('/api/observability/dashboard?hours=24')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/observability/dashboard?hours=24')
      .set('Authorization', `Bearer ${MANAGEMENT_TEST_TOKENS.content}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/observability/dashboard?hours=24')
      .set('Authorization', `Bearer ${MANAGEMENT_TEST_TOKENS.metrics}`)
      .expect(200);

    const fixture = await createFeedback(app, agentId, 'negative');

    await request(app.getHttpServer())
      .get(`/api/observability/traces/${fixture.traceId}`)
      .set('Authorization', `Bearer ${MANAGEMENT_TEST_TOKENS.metrics}`)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/observability/traces/${fixture.traceId}`)
      .set('Authorization', `Bearer ${MANAGEMENT_TEST_TOKENS.content}`)
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('质量闭环测试输入');
        expect(text).toContain('真实模型回答');
      });

    const rows: unknown = await dataSource.query(
      `SELECT "inputMessages", "outputText", "ciphertext", "keyVersion"
       FROM "observability_generation_contents"
       WHERE "generationId" = $1`,
      [fixture.generationId],
    );

    expect(rows).toEqual([
      expect.objectContaining({
        inputMessages: null,
        keyVersion: 'credential-derived-v1',
        outputText: null,
      }),
    ]);
    const firstRow: unknown = isUnknownArray(rows) ? rows[0] : undefined;

    if (!isRecord(firstRow)) {
      throw new Error('Expected encrypted observability content.');
    }

    expect(readString(firstRow, 'ciphertext')).not.toHaveLength(0);
    expect(JSON.stringify(rows)).not.toContain('质量闭环测试输入');

    const audits: unknown = await dataSource.query(
      `SELECT "subject", "action", "result", "metadata"
       FROM "management_audit_logs"
       WHERE "action" = 'observability.content.view'
       ORDER BY "createdAt" ASC`,
    );

    expect(audits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          result: 'denied',
          subject: 'metrics-operator',
        }),
        expect.objectContaining({
          result: 'succeeded',
          subject: 'content-auditor',
        }),
      ]),
    );
    expect(JSON.stringify(audits)).not.toContain(
      MANAGEMENT_TEST_TOKENS.content,
    );
    expect(JSON.stringify(audits)).not.toContain('质量闭环测试输入');
  });

  it('reviews feedback and converts one accepted item idempotently', async () => {
    const fixture = await createFeedback(app, agentId, 'negative');
    const review = await findPendingReview(app, fixture.feedbackId);
    const updatedAt = readString(review, 'updatedAt');

    await request(app.getHttpServer())
      .put(`/api/observability/feedback-reviews/${fixture.feedbackId}`)
      .set('Authorization', `Bearer ${MANAGEMENT_TEST_TOKENS.evaluation}`)
      .send({
        decision: 'accepted',
        expectedUpdatedAt: updatedAt,
        reason: '回答事实错误',
      })
      .expect(403);

    const accepted = await request(app.getHttpServer())
      .put(`/api/observability/feedback-reviews/${fixture.feedbackId}`)
      .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
      .send({
        decision: 'accepted',
        expectedUpdatedAt: updatedAt,
        reason: '回答事实错误',
      })
      .expect(200);

    expect(readString(parseRecord(accepted.text), 'reviewStatus')).toBe(
      'accepted',
    );

    await request(app.getHttpServer())
      .post(
        `/api/observability/feedback-reviews/${fixture.feedbackId}/evaluation-case`,
      )
      .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
      .send(conversionBody(otherSuiteId))
      .expect(422);

    const conversion = await request(app.getHttpServer())
      .post(
        `/api/observability/feedback-reviews/${fixture.feedbackId}/evaluation-case`,
      )
      .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
      .send(conversionBody(suiteId))
      .expect(201);
    const result = parseRecord(conversion.text);
    const evaluationCaseId = readString(result, 'evaluationCaseId');

    expect(result.alreadyConverted).toBe(false);

    await request(app.getHttpServer())
      .post(
        `/api/observability/feedback-reviews/${fixture.feedbackId}/evaluation-case`,
      )
      .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
      .send(conversionBody(suiteId))
      .expect(201)
      .expect(({ text }) => {
        const repeated = parseRecord(text);

        expect(repeated.alreadyConverted).toBe(true);
        expect(readString(repeated, 'evaluationCaseId')).toBe(evaluationCaseId);
      });

    const cases: unknown = await dataSource.query(
      `SELECT
         "id", "source", "sourceGenerationId", "sourceFeedbackId",
         "input", "expectedOutput", "evaluationCriteria", "tags"
       FROM "evaluation_cases"
       WHERE "sourceFeedbackId" = $1`,
      [fixture.feedbackId],
    );

    expect(cases).toEqual([
      expect.objectContaining({
        evaluationCriteria: '回答必须与事实一致',
        expectedOutput: '正确答案',
        id: evaluationCaseId,
        input: '脱敏后的问题',
        source: 'feedback',
        sourceFeedbackId: fixture.feedbackId,
        sourceGenerationId: fixture.generationId,
        tags: ['线上反馈', '事实性'],
      }),
    ]);
    expect(JSON.stringify(cases)).not.toContain(fixture.ownerToken);

    await expect(
      dataSource.query(
        `INSERT INTO "evaluation_cases" (
           "id", "suiteId", "input", "expectedKeywords", "source",
           "sourceGenerationId", "sourceFeedbackId", "expectedOutput",
           "evaluationCriteria", "tags"
         ) VALUES ($1, $2, $3, $4::jsonb, 'feedback', $5, $6, $7, $8, $9::jsonb)`,
        [
          randomUUID(),
          suiteId,
          '重复来源问题',
          JSON.stringify(['重复']),
          fixture.generationId,
          fixture.feedbackId,
          '重复答案',
          '不允许重复来源',
          JSON.stringify(['重复来源']),
        ],
      ),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'UQ_evaluation_cases_source_feedback',
    });

    await submitFeedback(
      app,
      agentId,
      fixture.generationId,
      fixture.ownerToken,
      'positive',
    );
    const converted: unknown = await dataSource.query(
      `SELECT "rating", "reviewStatus" FROM "observability_feedback" WHERE "id" = $1`,
      [fixture.feedbackId],
    );

    expect(converted).toEqual([
      { rating: 'positive', reviewStatus: 'converted' },
    ]);

    const audits: unknown = await dataSource.query(
      `SELECT "action", "result", COUNT(*)::integer AS "count"
       FROM "management_audit_logs"
       WHERE "resourceId" = $1
         AND "action" IN (
           'observability.feedback.review',
           'observability.feedback.convert'
         )
       GROUP BY "action", "result"
       ORDER BY "action", "result"`,
      [fixture.feedbackId],
    );

    expect(audits).toEqual([
      {
        action: 'observability.feedback.convert',
        count: 1,
        result: 'failed',
      },
      {
        action: 'observability.feedback.convert',
        count: 2,
        result: 'succeeded',
      },
      {
        action: 'observability.feedback.review',
        count: 1,
        result: 'denied',
      },
      {
        action: 'observability.feedback.review',
        count: 1,
        result: 'succeeded',
      },
    ]);
  });

  it('resets unconverted updates and serializes competing review decisions', async () => {
    const fixture = await createFeedback(app, agentId, 'negative');
    const review = await findPendingReview(app, fixture.feedbackId);
    const expectedUpdatedAt = readString(review, 'updatedAt');
    const [accepted, rejected] = await Promise.all([
      request(app.getHttpServer())
        .put(`/api/observability/feedback-reviews/${fixture.feedbackId}`)
        .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
        .send({
          decision: 'accepted',
          expectedUpdatedAt,
          reason: '并发接受',
        }),
      request(app.getHttpServer())
        .put(`/api/observability/feedback-reviews/${fixture.feedbackId}`)
        .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
        .send({
          decision: 'rejected',
          expectedUpdatedAt,
          reason: '并发拒绝',
        }),
    ]);

    expect([accepted.status, rejected.status].sort()).toEqual([200, 409]);

    await submitFeedback(
      app,
      agentId,
      fixture.generationId,
      fixture.ownerToken,
      'negative',
    );
    const reset: unknown = await dataSource.query(
      `SELECT "reviewStatus", "reviewerSubject", "reviewReason", "reviewedAt"
       FROM "observability_feedback"
       WHERE "id" = $1`,
      [fixture.feedbackId],
    );

    expect(reset).toEqual([
      {
        reviewReason: null,
        reviewedAt: null,
        reviewerSubject: null,
        reviewStatus: 'pending',
      },
    ]);
  });

  it('rejects negative feedback that bypasses the pending review state', async () => {
    const fixture = await createFeedback(app, agentId, 'positive');
    const invalidFeedbackId = randomUUID();

    await expect(
      dataSource.query(
        `INSERT INTO "observability_feedback" (
           "id", "generationId", "actorKeyHash", "source", "metric",
           "rating", "reasonCodes", "comment", "reviewStatus",
           "reviewerSubject", "reviewReason", "reviewedAt", "convertedAt",
           "createdAt", "updatedAt"
         )
         SELECT $1, "generationId", "actorKeyHash" || '-invalid', "source",
           "metric", 'negative', "reasonCodes", "comment", NULL, NULL, NULL,
           NULL, NULL, "createdAt", "updatedAt"
         FROM "observability_feedback"
         WHERE "id" = $2`,
        [invalidFeedbackId, fixture.feedbackId],
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'CHK_observability_feedback_review_state',
    });

    const rows: unknown = await dataSource.query(
      'SELECT "id" FROM "observability_feedback" WHERE "id" = $1',
      [invalidFeedbackId],
    );

    expect(rows).toEqual([]);
  });

  it('rolls back the evaluation case when the feedback update fails', async () => {
    const fixture = await createFeedback(app, agentId, 'negative');
    const review = await findPendingReview(app, fixture.feedbackId);

    await request(app.getHttpServer())
      .put(`/api/observability/feedback-reviews/${fixture.feedbackId}`)
      .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
      .send({
        decision: 'accepted',
        expectedUpdatedAt: readString(review, 'updatedAt'),
        reason: '验证事务回滚',
      })
      .expect(200);

    try {
      await dataSource.query(`
        CREATE FUNCTION "fail_feedback_update_for_test"()
        RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'forced feedback update failure';
        END;
        $$ LANGUAGE plpgsql
      `);
      await dataSource.query(`
        CREATE TRIGGER "TRG_fail_feedback_update_for_test"
        BEFORE UPDATE ON "observability_feedback"
        FOR EACH ROW
        EXECUTE FUNCTION "fail_feedback_update_for_test"()
      `);

      await request(app.getHttpServer())
        .post(
          `/api/observability/feedback-reviews/${fixture.feedbackId}/evaluation-case`,
        )
        .set('Authorization', MANAGEMENT_TEST_AUTHORIZATION)
        .send(conversionBody(suiteId))
        .expect(500);

      const cases: unknown = await dataSource.query(
        `SELECT "id" FROM "evaluation_cases" WHERE "sourceFeedbackId" = $1`,
        [fixture.feedbackId],
      );
      const feedback: unknown = await dataSource.query(
        `SELECT "reviewStatus", "convertedAt"
         FROM "observability_feedback"
         WHERE "id" = $1`,
        [fixture.feedbackId],
      );

      expect(cases).toEqual([]);
      expect(feedback).toEqual([
        { convertedAt: null, reviewStatus: 'accepted' },
      ]);
    } finally {
      await dataSource.query(
        'DROP TRIGGER IF EXISTS "TRG_fail_feedback_update_for_test" ON "observability_feedback"',
      );
      await dataSource.query(
        'DROP FUNCTION IF EXISTS "fail_feedback_update_for_test"()',
      );
    }
  });
});

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
