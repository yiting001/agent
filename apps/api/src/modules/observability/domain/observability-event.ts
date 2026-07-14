/** 观测告警等级。 */
export type ObservabilityAlertSeverity = 'critical' | 'warning';
/** 观测事件所属的调用边界。 */
export type ObservabilityCategory = 'http' | 'model' | 'tool';
/** 被观测操作的最终状态。 */
export type ObservabilityStatus = 'cancelled' | 'error' | 'ok';
/** token 数量的可信来源。 */
export type TokenCountSource = 'actual' | 'estimated' | 'unavailable';

/** 单个 HTTP、模型或工具 span 的持久化观测事件。 */
export interface ObservabilityEvent {
  agentId?: string;
  alertMessage?: string;
  alertSeverity?: ObservabilityAlertSeverity;
  category: ObservabilityCategory;
  /** 以百万分之一美元存储，避免浮点累计误差。 */
  costUsdMicros: number;
  durationMs: number;
  errorMessage?: string;
  id: string;
  inputTokens: number;
  /** 仅允许低基数、非敏感元数据，禁止记录提示词和密钥。 */
  metadata: Record<string, string | number | boolean>;
  method?: string;
  model?: string;
  operation: string;
  outputTokens: number;
  /** 父 span 标识，用于还原调用树。 */
  parentSpanId?: string;
  providerId?: string;
  route?: string;
  /** 当前 span 标识。 */
  spanId: string;
  startedAt: Date;
  status: ObservabilityStatus;
  statusCode?: number;
  tokenCountSource: TokenCountSource;
  /** 跨模块传播的根追踪标识。 */
  traceId: string;
}

/** 由时间窗口内事件和进程指标聚合出的管理端仪表盘。 */
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
