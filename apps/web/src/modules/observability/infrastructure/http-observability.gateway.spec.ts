import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '@/shared/http/http-client';

import { HttpObservabilityGateway } from './http-observability.gateway';

function httpClient(): HttpClient {
  return {
    delete: vi.fn(),
    get: vi.fn().mockResolvedValue({ items: [] }),
    patch: vi.fn(),
    post: vi.fn().mockResolvedValue({ reviewStatus: 'converted' }),
    postEventStream: vi.fn(),
    postFile: vi.fn(),
    put: vi.fn().mockResolvedValue({ reviewStatus: 'accepted' }),
    putBlob: vi.fn(),
    putFile: vi.fn(),
  };
}

describe('HttpObservabilityGateway', () => {
  it('uses the selected review status with stable pagination', async () => {
    const client = httpClient();
    const gateway = new HttpObservabilityGateway(client);

    await gateway.listFeedbackReviews('accepted', 2, 20);

    expect(client.get).toHaveBeenCalledWith(
      '/observability/feedback-reviews?page=2&pageSize=20&status=accepted',
    );
  });

  it('sends optimistic decision and conversion payloads', async () => {
    const client = httpClient();
    const gateway = new HttpObservabilityGateway(client);
    const decision = {
      decision: 'accepted' as const,
      expectedUpdatedAt: '2026-07-16T00:00:00.000Z',
      reason: '适合作为回归样本',
    };
    const conversion = {
      evaluationCriteria: '事实准确',
      expectedKeywords: ['正确答案'],
      expectedOutput: '正确答案',
      input: '脱敏问题',
      suiteId: 'suite-id',
      tags: ['feedback'],
    };

    await gateway.decideFeedbackReview('feedback/id', decision);
    await gateway.convertFeedbackReview('feedback/id', conversion);

    expect(client.put).toHaveBeenCalledWith(
      '/observability/feedback-reviews/feedback%2Fid',
      decision,
    );
    expect(client.post).toHaveBeenCalledWith(
      '/observability/feedback-reviews/feedback%2Fid/evaluation-case',
      conversion,
    );
  });
});
