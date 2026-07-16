import type { ObservabilityEvent } from '../domain/observability-event';
import { ObservabilityEventRepository } from './observability-event.repository';
import { ObservabilityGenerationRepository } from './observability-generation.repository';
import { GetObservabilityDashboardUseCase } from './get-observability-dashboard.use-case';

function event(
  input: Partial<ObservabilityEvent> &
    Pick<ObservabilityEvent, 'category' | 'operation'>,
): ObservabilityEvent {
  return {
    ...input,
    category: input.category,
    costUsdMicros: input.costUsdMicros ?? 0,
    durationMs: input.durationMs ?? 100,
    finishReasons: input.finishReasons ?? [],
    id: input.id ?? input.operation,
    inputTokens: input.inputTokens ?? 0,
    metadata: {},
    operation: input.operation,
    outputTokens: input.outputTokens ?? 0,
    spanId: input.spanId ?? `${input.operation}-span`,
    startedAt: input.startedAt ?? new Date(),
    status: input.status ?? 'ok',
    tokenCountSource: input.tokenCountSource ?? 'unavailable',
    traceId: input.traceId ?? 'trace-1',
  };
}

describe('GetObservabilityDashboardUseCase', () => {
  it('汇总黄金指标、模型用量、成本和链路告警', async () => {
    const repository = {
      findSince: jest.fn().mockResolvedValue([
        event({
          alertMessage: 'GET /api/chat 请求执行失败',
          alertSeverity: 'critical',
          category: 'http',
          durationMs: 500,
          operation: 'GET /api/chat',
          status: 'error',
        }),
        event({
          category: 'model',
          costUsdMicros: 2_500,
          durationMs: 300,
          inputTokens: 100,
          operation: 'chat.generate',
          outputTokens: 50,
          tokenCountSource: 'actual',
        }),
      ]),
    } as unknown as ObservabilityEventRepository;
    const generations = {
      getQualitySummary: jest.fn().mockResolvedValue({
        feedbackCount: 2,
        modelMismatchCount: 1,
        negativeFeedbackCount: 1,
        positiveFeedbackRate: 50,
      }),
    } as unknown as ObservabilityGenerationRepository;
    const useCase = new GetObservabilityDashboardUseCase(
      repository,
      generations,
    );

    const dashboard = await useCase.execute(24);

    expect(dashboard.goldenSignals).toEqual(
      expect.objectContaining({
        errorRate: 100,
        modelCallCount: 1,
        p95LatencyMs: 500,
        requestCount: 1,
      }),
    );
    expect(dashboard.usage).toEqual({
      estimatedCostUsd: 0.0025,
      inputTokens: 100,
      outputTokens: 50,
      pricedModelCallCount: 1,
    });
    expect(dashboard.alerts).toHaveLength(1);
    expect(dashboard.quality).toEqual({
      feedbackCount: 2,
      modelMismatchCount: 1,
      negativeFeedbackCount: 1,
      positiveFeedbackRate: 50,
    });
    expect(dashboard.recentTraces[0]).toEqual(
      expect.objectContaining({
        costUsd: 0.0025,
        spanCount: 2,
        status: 'error',
        traceId: 'trace-1',
      }),
    );
  });
});
