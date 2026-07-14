export type ObservabilityAlertSeverity = 'critical' | 'warning';
export type ObservabilityStatus = 'cancelled' | 'error' | 'ok';

export interface ObservabilityDashboard {
  alerts: Array<{
    message: string;
    occurredAt: string;
    operation: string;
    severity: ObservabilityAlertSeverity;
    traceId: string;
  }>;
  generatedAt: string;
  goldenSignals: {
    averageLatencyMs: number;
    errorRate: number;
    modelCallCount: number;
    p95LatencyMs: number;
    requestCount: number;
  };
  recentTraces: Array<{
    costUsd: number;
    durationMs: number;
    inputTokens: number;
    operation: string;
    outputTokens: number;
    spanCount: number;
    startedAt: string;
    status: ObservabilityStatus;
    traceId: string;
  }>;
  runtime: {
    heapTotalBytes: number;
    heapUsedBytes: number;
    heapUtilization: number;
    rssBytes: number;
    uptimeSeconds: number;
  };
  series: Array<{
    costUsd: number;
    errorCount: number;
    modelCallCount: number;
    requestCount: number;
    startedAt: string;
  }>;
  usage: {
    estimatedCostUsd: number;
    inputTokens: number;
    outputTokens: number;
    pricedModelCallCount: number;
  };
  windowHours: number;
}
