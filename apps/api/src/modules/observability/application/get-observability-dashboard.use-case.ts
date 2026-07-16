import { Injectable } from '@nestjs/common';

import type {
  ObservabilityDashboard,
  ObservabilityEvent,
} from '../domain/observability-event';
import { ObservabilityEventRepository } from './observability-event.repository';
import { buildObservabilityTraceSummary } from './observability-trace.mapper';

const MAX_RECENT_ALERTS = 20;
const MAX_RECENT_TRACES = 20;
const MAX_SERIES_BUCKETS = 24;

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * ratio) - 1,
  );

  return sorted[index] ?? 0;
}

@Injectable()
export class GetObservabilityDashboardUseCase {
  constructor(private readonly repository: ObservabilityEventRepository) {}

  async execute(hours: number): Promise<ObservabilityDashboard> {
    const now = new Date();
    const since = new Date(now.getTime() - hours * 60 * 60 * 1_000);
    const events = await this.repository.findSince(since);
    const requests = events.filter((event) => event.category === 'http');
    const modelCalls = events.filter((event) => event.category === 'model');
    const requestDurations = requests.map((event) => event.durationMs);
    const totalCostUsdMicros = modelCalls.reduce(
      (total, event) => total + event.costUsdMicros,
      0,
    );
    const memory = process.memoryUsage();

    return {
      alerts: events
        .filter(
          (
            event,
          ): event is ObservabilityEvent & {
            alertMessage: string;
            alertSeverity: NonNullable<ObservabilityEvent['alertSeverity']>;
          } => Boolean(event.alertMessage && event.alertSeverity),
        )
        .slice(0, MAX_RECENT_ALERTS)
        .map((event) => ({
          message: event.alertMessage,
          occurredAt: event.startedAt.toISOString(),
          operation: event.operation,
          severity: event.alertSeverity,
          traceId: event.traceId,
        })),
      generatedAt: now.toISOString(),
      goldenSignals: {
        averageLatencyMs: round(
          requestDurations.reduce((total, value) => total + value, 0) /
            Math.max(requestDurations.length, 1),
        ),
        errorRate: round(
          (requests.filter((event) => event.status === 'error').length /
            Math.max(requests.length, 1)) *
            100,
        ),
        modelCallCount: modelCalls.length,
        p95LatencyMs: round(percentile(requestDurations, 0.95)),
        requestCount: requests.length,
      },
      recentTraces: this.buildRecentTraces(events),
      runtime: {
        heapTotalBytes: memory.heapTotal,
        heapUsedBytes: memory.heapUsed,
        heapUtilization: round(
          (memory.heapUsed / Math.max(memory.heapTotal, 1)) * 100,
        ),
        rssBytes: memory.rss,
        uptimeSeconds: Math.floor(process.uptime()),
      },
      series: this.buildSeries(events, since, now, hours),
      usage: {
        estimatedCostUsd: round(totalCostUsdMicros / 1_000_000, 6),
        inputTokens: modelCalls.reduce(
          (total, event) => total + event.inputTokens,
          0,
        ),
        outputTokens: modelCalls.reduce(
          (total, event) => total + event.outputTokens,
          0,
        ),
        pricedModelCallCount: modelCalls.filter(
          (event) => event.costUsdMicros > 0,
        ).length,
      },
      windowHours: hours,
    };
  }

  private buildRecentTraces(
    events: ObservabilityEvent[],
  ): ObservabilityDashboard['recentTraces'] {
    const traces = new Map<string, ObservabilityEvent[]>();

    for (const event of events) {
      const trace = traces.get(event.traceId) ?? [];

      trace.push(event);
      traces.set(event.traceId, trace);
    }

    return [...traces.entries()]
      .map(([traceId, traceEvents]) =>
        buildObservabilityTraceSummary(traceId, traceEvents),
      )
      .filter(
        (trace): trace is ObservabilityDashboard['recentTraces'][number] =>
          trace !== undefined,
      )
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .slice(0, MAX_RECENT_TRACES);
  }

  private buildSeries(
    events: ObservabilityEvent[],
    since: Date,
    now: Date,
    hours: number,
  ): ObservabilityDashboard['series'] {
    const bucketCount = Math.min(MAX_SERIES_BUCKETS, Math.max(1, hours));
    const bucketMs = (now.getTime() - since.getTime()) / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, index) => ({
      costUsdMicros: 0,
      errorCount: 0,
      modelCallCount: 0,
      requestCount: 0,
      startedAt: new Date(since.getTime() + index * bucketMs),
    }));

    for (const event of events) {
      const index = Math.min(
        bucketCount - 1,
        Math.max(
          0,
          Math.floor((event.startedAt.getTime() - since.getTime()) / bucketMs),
        ),
      );
      const bucket = buckets[index];

      if (!bucket) {
        continue;
      }

      if (event.category === 'http') {
        bucket.requestCount += 1;
        bucket.errorCount += event.status === 'error' ? 1 : 0;
      }

      if (event.category === 'model') {
        bucket.modelCallCount += 1;
        bucket.costUsdMicros += event.costUsdMicros;
      }
    }

    return buckets.map((bucket) => ({
      costUsd: round(bucket.costUsdMicros / 1_000_000, 6),
      errorCount: bucket.errorCount,
      modelCallCount: bucket.modelCallCount,
      requestCount: bucket.requestCount,
      startedAt: bucket.startedAt.toISOString(),
    }));
  }
}
