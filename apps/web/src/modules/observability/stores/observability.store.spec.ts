// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applicationDependencies } from '@/app/dependencies';
import type { EvaluationSuiteSummary } from '@/modules/evaluation/domain/evaluation';
import { useManagementAccessStore } from '@/modules/management-access/stores/management-access.store';
import { HttpError } from '@/shared/http/http-client';

import type {
  ConvertFeedbackReviewInput,
  FeedbackReviewItem,
} from '../domain/feedback-review';
import type {
  ObservabilityDashboard,
  ObservabilityTraceDetail,
  ObservabilityTracePage,
} from '../domain/observability-dashboard';
import { useObservabilityStore } from './observability.store';

const dashboard: ObservabilityDashboard = {
  alerts: [],
  generatedAt: '2026-07-16T00:00:00.000Z',
  goldenSignals: {
    averageLatencyMs: 10,
    errorRate: 0,
    modelCallCount: 1,
    p95LatencyMs: 12,
    requestCount: 1,
  },
  quality: {
    feedbackCount: 1,
    modelMismatchCount: 0,
    negativeFeedbackCount: 1,
    positiveFeedbackRate: 0,
  },
  recentTraces: [],
  runtime: {
    heapTotalBytes: 100,
    heapUsedBytes: 50,
    heapUtilization: 0.5,
    rssBytes: 200,
    uptimeSeconds: 60,
  },
  series: [],
  usage: {
    estimatedCostUsd: 0,
    inputTokens: 10,
    outputTokens: 20,
    pricedModelCallCount: 1,
  },
  windowHours: 24,
};

const tracePage: ObservabilityTracePage = {
  items: [],
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
};

function review(
  overrides: Partial<FeedbackReviewItem> = {},
): FeedbackReviewItem {
  return {
    agentId: 'agent-id',
    comment: '回答不准确',
    createdAt: '2026-07-16T00:00:00.000Z',
    expectedOutput: '正确答案',
    feedbackId: 'feedback-id',
    generationId: 'generation-id',
    input: '脱敏问题',
    rating: 'negative',
    reasonCodes: ['incorrect'],
    reviewStatus: 'pending',
    truncated: false,
    updatedAt: '2026-07-16T00:00:00.000Z',
    ...overrides,
  };
}

const suite: EvaluationSuiteSummary = {
  agentId: 'agent-id',
  caseCount: 1,
  createdAt: '2026-07-16T00:00:00.000Z',
  description: '回归集',
  id: 'suite-id',
  metricCount: 1,
  name: '核心回归',
  status: 'ready',
  updatedAt: '2026-07-16T00:00:00.000Z',
};

const conversionInput: ConvertFeedbackReviewInput = {
  evaluationCriteria: '事实准确',
  expectedKeywords: ['正确答案'],
  expectedOutput: '正确答案',
  input: '脱敏问题',
  suiteId: 'suite-id',
  tags: ['feedback'],
};

async function authenticate(): Promise<void> {
  vi.spyOn(
    applicationDependencies.managementAccessGateway,
    'getSession',
  ).mockResolvedValue({
    scopes: [
      'evaluation:manage',
      'observability:content',
      'observability:feedback',
      'observability:metrics',
    ],
    subject: 'operator',
  });

  await useManagementAccessStore().login('management-secret');
}

describe('useObservabilityStore', () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    setActivePinia(createPinia());
    await authenticate();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps metrics available when the credential cannot review feedback', async () => {
    const gateway = applicationDependencies.observabilityGateway;

    vi.spyOn(gateway, 'getDashboard').mockResolvedValue(dashboard);
    vi.spyOn(gateway, 'listTraces').mockResolvedValue(tracePage);
    vi.spyOn(gateway, 'listFeedbackReviews').mockRejectedValue(
      new HttpError('forbidden', 403),
    );
    const store = useObservabilityStore();

    await Promise.all([store.refresh(), store.loadFeedbackReviews()]);

    expect(store.dashboard).toEqual(dashboard);
    expect(store.errorMessage).toBe('');
    expect(store.feedbackReviewErrorMessage).toContain('反馈审核权限');
  });

  it('retains a failed decision and retries it with optimistic concurrency', async () => {
    const gateway = applicationDependencies.observabilityGateway;
    const pending = review();
    const accepted = review({ reviewStatus: 'accepted' });
    const decide = vi
      .spyOn(gateway, 'decideFeedbackReview')
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(accepted);
    const store = useObservabilityStore();

    store.feedbackReviewPage = {
      items: [pending],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    };

    expect(
      await store.decideFeedbackReview(pending.feedbackId, {
        decision: 'accepted',
        expectedUpdatedAt: pending.updatedAt,
        reason: '适合作为回归样本',
      }),
    ).toBeUndefined();
    expect(store.feedbackReviewActionError).toContain('temporary failure');

    expect(await store.retryFeedbackReviewDecision()).toEqual(accepted);
    expect(decide).toHaveBeenCalledTimes(2);
    expect(decide.mock.calls[1]?.[1].expectedUpdatedAt).toBe(pending.updatedAt);
    expect(store.feedbackReviewPage.items).toEqual([]);
  });

  it('keeps conversion data open after failure and permits a retry', async () => {
    const gateway = applicationDependencies.observabilityGateway;
    const accepted = review({ reviewStatus: 'accepted' });

    vi.spyOn(
      applicationDependencies.evaluationGateway,
      'listSuites',
    ).mockResolvedValue([
      suite,
      { ...suite, agentId: 'other-agent', id: 'other-suite' },
    ]);
    const convert = vi
      .spyOn(gateway, 'convertFeedbackReview')
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce({
        alreadyConverted: false,
        evaluationCaseId: 'case-id',
        feedbackId: accepted.feedbackId,
        reviewStatus: 'converted',
      });
    const store = useObservabilityStore();

    await store.openFeedbackReviewConversion(accepted);

    expect(store.conversionSuites).toEqual([suite]);
    expect(await store.convertFeedbackReview(conversionInput)).toBe(false);
    expect(store.selectedFeedbackReview).toEqual(accepted);
    expect(store.conversionErrorMessage).toContain('database unavailable');

    expect(await store.convertFeedbackReview(conversionInput)).toBe(true);
    expect(convert).toHaveBeenCalledTimes(2);
    expect(store.selectedFeedbackReview).toBeUndefined();
    expect(store.conversionResult?.evaluationCaseId).toBe('case-id');
  });

  it('recovers an accepted review after refresh and reopens conversion', async () => {
    const accepted = review({ reviewStatus: 'accepted' });
    const listReviews = vi
      .spyOn(
        applicationDependencies.observabilityGateway,
        'listFeedbackReviews',
      )
      .mockResolvedValue({
        items: [accepted],
        page: 2,
        pageSize: 20,
        total: 21,
        totalPages: 2,
      });
    vi.spyOn(
      applicationDependencies.evaluationGateway,
      'listSuites',
    ).mockResolvedValue([suite]);
    const store = useObservabilityStore();

    await store.loadFeedbackReviews('accepted', 2);
    await store.openFeedbackReviewConversion(
      store.feedbackReviewPage.items[0]!,
    );

    expect(listReviews).toHaveBeenCalledWith('accepted', 2, 20);
    expect(store.selectedFeedbackReview).toEqual(accepted);
    expect(store.conversionSuites).toEqual([suite]);
  });

  it('distinguishes Trace content denial and supports retrying the same trace', async () => {
    const trace: ObservabilityTraceDetail = {
      costUsd: 0,
      durationMs: 10,
      generations: [],
      inputTokens: 10,
      operation: 'chat',
      outputTokens: 20,
      spanCount: 0,
      spans: [],
      startedAt: '2026-07-16T00:00:00.000Z',
      status: 'ok',
      traceId: 'trace-id',
    };
    vi.spyOn(applicationDependencies.observabilityGateway, 'getTrace')
      .mockRejectedValueOnce(new HttpError('forbidden', 403))
      .mockResolvedValueOnce(trace);
    const store = useObservabilityStore();

    await store.openTrace(trace.traceId);
    expect(store.traceDetailErrorMessage).toContain('Trace 正文权限');

    await store.openTrace(trace.traceId);
    expect(store.traceDetailErrorMessage).toBe('');
    expect(store.selectedTrace).toEqual(trace);
  });

  it('does not repopulate review content after logout resets the store', async () => {
    let resolvePage: (
      page: Awaited<
        ReturnType<
          typeof applicationDependencies.observabilityGateway.listFeedbackReviews
        >
      >,
    ) => void = () => undefined;
    vi.spyOn(
      applicationDependencies.observabilityGateway,
      'listFeedbackReviews',
    ).mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      }),
    );
    const store = useObservabilityStore();
    const loading = store.loadFeedbackReviews();

    store.reset();
    resolvePage({
      items: [review()],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    await loading;

    expect(store.feedbackReviewPage.items).toEqual([]);
  });

  it('clears data and the credential when a protected request returns 401', async () => {
    const gateway = applicationDependencies.observabilityGateway;

    vi.spyOn(gateway, 'getDashboard').mockRejectedValue(
      new HttpError('unauthorized', 401),
    );
    vi.spyOn(gateway, 'listTraces').mockResolvedValue(tracePage);
    const store = useObservabilityStore();

    store.dashboard = dashboard;
    store.feedbackReviewPage = {
      items: [review()],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    };

    await store.refresh();

    expect(store.dashboard).toBeUndefined();
    expect(store.feedbackReviewPage.items).toEqual([]);
    expect(store.errorMessage).toContain('管理凭证无效');
    expect(useManagementAccessStore().session).toBeUndefined();
    expect(window.sessionStorage.length).toBe(0);
  });
});
