import { ApplicationError } from '../../../shared/application/application-error';
import type { ObservabilityEvent } from '../domain/observability-event';
import {
  ObservabilityEventRepository,
  type FindObservabilityTracePageInput,
  type ObservabilityTraceEventPage,
} from './observability-event.repository';
import { GetObservabilityTraceUseCase } from './get-observability-trace.use-case';
import { ListObservabilityTracesUseCase } from './list-observability-traces.use-case';

function event(
  input: Partial<ObservabilityEvent> &
    Pick<ObservabilityEvent, 'category' | 'operation'>,
): ObservabilityEvent {
  return {
    ...input,
    category: input.category,
    costUsdMicros: input.costUsdMicros ?? 0,
    durationMs: input.durationMs ?? 100,
    id: input.id ?? input.operation,
    inputTokens: input.inputTokens ?? 0,
    metadata: input.metadata ?? {},
    operation: input.operation,
    outputTokens: input.outputTokens ?? 0,
    spanId: input.spanId ?? `${input.operation}-span`,
    startedAt: input.startedAt ?? new Date('2026-07-15T00:00:00.000Z'),
    status: input.status ?? 'ok',
    tokenCountSource: input.tokenCountSource ?? 'unavailable',
    traceId: input.traceId ?? 'trace-1',
  };
}

describe('Observability trace use cases', () => {
  it('returns a server-paginated trace summary page', async () => {
    const findTracePage = jest.fn(
      (
        input: FindObservabilityTracePageInput,
      ): Promise<ObservabilityTraceEventPage> => {
        void input;

        return Promise.resolve({
          events: [
            event({
              category: 'http',
              operation: 'GET /api/agents',
              startedAt: new Date('2026-07-15T00:00:03.000Z'),
              traceId: 'trace-a',
            }),
          ],
          total: 21,
          traceIds: ['trace-a'],
        });
      },
    );
    const repository = {
      findTracePage,
    } as unknown as ObservabilityEventRepository;
    const useCase = new ListObservabilityTracesUseCase(repository);

    const page = await useCase.execute(
      24,
      2,
      10,
      '2026-07-15T00:00:04.000Z',
      'trace-before',
    );

    const input = findTracePage.mock.calls[0]?.[0];

    expect(input?.limit).toBe(10);
    expect(input?.offset).toBe(0);
    expect(input?.since).toBeInstanceOf(Date);
    expect(input?.cursor).toEqual({
      startedAt: new Date('2026-07-15T00:00:04.000Z'),
      traceId: 'trace-before',
    });
    expect(page).toEqual({
      items: [
        expect.objectContaining({
          operation: 'GET /api/agents',
          traceId: 'trace-a',
        }),
      ],
      nextCursor: {
        startedAt: '2026-07-15T00:00:03.000Z',
        traceId: 'trace-a',
      },
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('returns the full trace with parent-child span information', async () => {
    const repository = {
      findByTraceId: jest.fn().mockResolvedValue([
        event({
          category: 'model',
          costUsdMicros: 2500,
          inputTokens: 100,
          operation: 'chat.generate',
          parentSpanId: 'http-span',
          outputTokens: 50,
          spanId: 'model-span',
          startedAt: new Date('2026-07-15T00:00:00.050Z'),
          traceId: 'trace-detail',
        }),
        event({
          category: 'http',
          method: 'GET',
          operation: 'GET /api/chat',
          route: '/api/chat',
          spanId: 'http-span',
          startedAt: new Date('2026-07-15T00:00:00.000Z'),
          traceId: 'trace-detail',
        }),
      ]),
    } as unknown as ObservabilityEventRepository;
    const useCase = new GetObservabilityTraceUseCase(repository);

    const detail = await useCase.execute('trace-detail');

    expect(detail).toEqual(
      expect.objectContaining({
        operation: 'GET /api/chat',
        spanCount: 2,
        traceId: 'trace-detail',
      }),
    );
    expect(detail.spans).toEqual([
      expect.objectContaining({ spanId: 'http-span' }),
      expect.objectContaining({
        costUsd: 0.0025,
        parentSpanId: 'http-span',
        spanId: 'model-span',
      }),
    ]);
  });

  it('raises not-found when a trace does not exist', async () => {
    const repository = {
      findByTraceId: jest.fn().mockResolvedValue([]),
    } as unknown as ObservabilityEventRepository;
    const useCase = new GetObservabilityTraceUseCase(repository);

    await expect(useCase.execute('missing-trace')).rejects.toEqual(
      new ApplicationError('not_found', '执行链路不存在。'),
    );
  });
});
