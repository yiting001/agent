/** 前端展示的告警等级。 */
export type ObservabilityAlertSeverity = 'critical' | 'warning';
/** 前端展示的操作最终状态。 */
export type ObservabilityStatus = 'cancelled' | 'error' | 'ok';

export type ObservabilityCategory = 'http' | 'model' | 'tool';

export type ObservabilityTokenCountSource =
  | 'actual'
  | 'estimated'
  | 'unavailable';

export interface ObservabilityTraceSummary {
  costUsd: number;
  durationMs: number;
  inputTokens: number;
  operation: string;
  outputTokens: number;
  spanCount: number;
  startedAt: string;
  status: ObservabilityStatus;
  traceId: string;
}

export interface ObservabilityTraceSpan {
  agentId?: string;
  category: ObservabilityCategory;
  costUsd: number;
  durationMs: number;
  errorMessage?: string;
  finishReasons: string[];
  generationId?: string;
  inputTokens: number;
  metadata: Record<string, string | number | boolean>;
  method?: string;
  model?: string;
  operation: string;
  outputTokens: number;
  parentSpanId?: string;
  providerId?: string;
  providerName?: string;
  requestedModel?: string;
  responseModel?: string;
  route?: string;
  spanId: string;
  startedAt: string;
  status: ObservabilityStatus;
  statusCode?: number;
  tokenCountSource: ObservabilityTokenCountSource;
  upstreamResponseId?: string;
}

export interface ObservabilityGenerationMessage {
  content: string;
  role: 'assistant' | 'system' | 'tool' | 'user';
}

export interface ObservabilityGenerationFeedback {
  comment?: string;
  createdAt: string;
  id: string;
  metric: 'helpfulness';
  rating: 'negative' | 'positive';
  reasonCodes: Array<
    'citation' | 'format' | 'incorrect' | 'irrelevant' | 'model' | 'other'
  >;
  source: 'admin' | 'end_user' | 'llm_judge' | 'rule';
  updatedAt: string;
}

export interface ObservabilityGenerationDetail {
  agentId: string;
  captureMode: 'off' | 'redacted';
  completedAt?: string;
  configuration: {
    agentUpdatedAt: string;
    citationDocumentIds: string[];
    policyRevisions: Array<{ key: string; revision: number }>;
    skillIds: string[];
  };
  conversationId?: string;
  feedback: ObservabilityGenerationFeedback[];
  finishReasons: string[];
  id: string;
  inputMessages: ObservabilityGenerationMessage[];
  outputText: string;
  providerId: string;
  providerName: string;
  requestedModel: string;
  responseModel?: string;
  source: string;
  startedAt: string;
  status: 'cancelled' | 'completed' | 'error' | 'running';
  traceId: string;
  truncated: boolean;
  upstreamResponseId?: string;
}

export interface ObservabilityTraceDetail extends ObservabilityTraceSummary {
  generations: ObservabilityGenerationDetail[];
  spans: ObservabilityTraceSpan[];
}

export interface ObservabilityTracePage {
  items: ObservabilityTraceSummary[];
  nextCursor?: {
    startedAt: string;
    traceId: string;
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** 指定时间窗口内的黄金指标、追踪、成本和运行时快照。 */
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
  quality: {
    feedbackCount: number;
    modelMismatchCount: number;
    negativeFeedbackCount: number;
    positiveFeedbackRate: number;
  };
  recentTraces: ObservabilityTraceSummary[];
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
