import type {
  ObservabilityEvent,
  ObservabilityStatus,
  ObservabilityTraceDetail,
  ObservabilityTraceSummary,
} from '../domain/observability-event';

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function traceStatus(events: ObservabilityEvent[]): ObservabilityStatus {
  if (events.some((event) => event.status === 'error')) {
    return 'error';
  }

  if (events.some((event) => event.status === 'cancelled')) {
    return 'cancelled';
  }

  return 'ok';
}

function chronological(events: ObservabilityEvent[]): ObservabilityEvent[] {
  return [...events].sort((left, right) => {
    const timeDifference = left.startedAt.getTime() - right.startedAt.getTime();

    if (timeDifference !== 0) {
      return timeDifference;
    }

    if (Boolean(left.parentSpanId) !== Boolean(right.parentSpanId)) {
      return left.parentSpanId ? 1 : -1;
    }

    return left.spanId.localeCompare(right.spanId);
  });
}

function rootEvent(
  events: ObservabilityEvent[],
): ObservabilityEvent | undefined {
  const ordered = chronological(events);

  return (
    ordered.find((event) => event.category === 'http' && !event.parentSpanId) ??
    ordered.find((event) => event.category === 'http') ??
    ordered.find((event) => !event.parentSpanId) ??
    ordered[0]
  );
}

export function buildObservabilityTraceSummary(
  traceId: string,
  events: ObservabilityEvent[],
): ObservabilityTraceSummary | undefined {
  const root = rootEvent(events);

  if (!root) {
    return undefined;
  }

  return {
    costUsd: round(
      events.reduce((total, event) => total + event.costUsdMicros, 0) /
        1_000_000,
      6,
    ),
    durationMs: round(root.durationMs),
    inputTokens: events.reduce((total, event) => total + event.inputTokens, 0),
    operation: root.operation,
    outputTokens: events.reduce(
      (total, event) => total + event.outputTokens,
      0,
    ),
    spanCount: events.length,
    startedAt: root.startedAt.toISOString(),
    status: traceStatus(events),
    traceId,
  };
}

export function buildObservabilityTraceDetail(
  traceId: string,
  events: ObservabilityEvent[],
): ObservabilityTraceDetail | undefined {
  const summary = buildObservabilityTraceSummary(traceId, events);

  if (!summary) {
    return undefined;
  }

  return {
    ...summary,
    spans: chronological(events).map((event) => ({
      agentId: event.agentId,
      category: event.category,
      costUsd: round(event.costUsdMicros / 1_000_000, 6),
      durationMs: round(event.durationMs),
      errorMessage: event.errorMessage,
      finishReasons: event.finishReasons,
      generationId: event.generationId,
      inputTokens: event.inputTokens,
      metadata: event.metadata,
      method: event.method,
      model: event.model,
      operation: event.operation,
      outputTokens: event.outputTokens,
      parentSpanId: event.parentSpanId,
      providerId: event.providerId,
      providerName: event.providerName,
      requestedModel: event.requestedModel,
      responseModel: event.responseModel,
      route: event.route,
      spanId: event.spanId,
      startedAt: event.startedAt.toISOString(),
      status: event.status,
      statusCode: event.statusCode,
      tokenCountSource: event.tokenCountSource,
      upstreamResponseId: event.upstreamResponseId,
    })),
    generations: [],
  };
}
