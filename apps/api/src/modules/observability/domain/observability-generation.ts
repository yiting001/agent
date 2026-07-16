/** 模型生成正文的可配置采集模式。 */
export type ObservabilityCaptureMode = 'off' | 'redacted';
/** 一次 Assistant 回答的生命周期。 */
export type ObservabilityGenerationStatus =
  | 'cancelled'
  | 'completed'
  | 'error'
  | 'running';
/** 反馈来源，后续自动评估与人工评审复用同一模型。 */
export type ObservabilityFeedbackSource =
  | 'admin'
  | 'end_user'
  | 'llm_judge'
  | 'rule';
/** 一期用户反馈评价的质量维度。 */
export type ObservabilityFeedbackMetric = 'helpfulness';
export type ObservabilityFeedbackRating = 'negative' | 'positive';
export type ObservabilityFeedbackReason =
  | 'citation'
  | 'format'
  | 'incorrect'
  | 'irrelevant'
  | 'model'
  | 'other';

export interface ObservabilityGenerationMessage {
  content: string;
  role: 'assistant' | 'system' | 'tool' | 'user';
}

export interface ObservabilityGenerationConfiguration {
  agentUpdatedAt: string;
  citationDocumentIds: string[];
  policyRevisions: Array<{
    key: string;
    revision: number;
  }>;
  skillIds: string[];
}

/** 与普通性能事件分离的一次 Assistant 回答元数据。 */
export interface ObservabilityGeneration {
  actorKeyHash?: string;
  agentId: string;
  completedAt?: Date;
  configuration: ObservabilityGenerationConfiguration;
  conversationId?: string;
  finishReasons: string[];
  id: string;
  providerId: string;
  providerName: string;
  requestedModel: string;
  responseModel?: string;
  source: string;
  startedAt: Date;
  status: ObservabilityGenerationStatus;
  traceId: string;
  upstreamResponseId?: string;
}

/** 输入输出正文独立设置保留期，禁止将其写入普通事件 metadata。 */
export interface ObservabilityGenerationContent {
  captureMode: ObservabilityCaptureMode;
  expiresAt: Date;
  generationId: string;
  inputMessages: ObservabilityGenerationMessage[];
  outputText: string;
  redactionCount: number;
  truncated: boolean;
}

export interface ObservabilityFeedback {
  actorKeyHash: string;
  comment?: string;
  createdAt: Date;
  generationId: string;
  id: string;
  metric: ObservabilityFeedbackMetric;
  rating: ObservabilityFeedbackRating;
  reasonCodes: ObservabilityFeedbackReason[];
  source: ObservabilityFeedbackSource;
  updatedAt: Date;
}

export interface ObservabilityGenerationDetail {
  agentId: string;
  captureMode: ObservabilityCaptureMode;
  completedAt?: string;
  configuration: ObservabilityGenerationConfiguration;
  conversationId?: string;
  feedback: ObservabilityFeedbackView[];
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
  status: ObservabilityGenerationStatus;
  traceId: string;
  truncated: boolean;
  upstreamResponseId?: string;
}

export interface ObservabilityFeedbackView {
  comment?: string;
  createdAt: string;
  id: string;
  metric: ObservabilityFeedbackMetric;
  rating: ObservabilityFeedbackRating;
  reasonCodes: ObservabilityFeedbackReason[];
  source: ObservabilityFeedbackSource;
  updatedAt: string;
}

export interface ObservabilityQualitySummary {
  feedbackCount: number;
  modelMismatchCount: number;
  negativeFeedbackCount: number;
  positiveFeedbackRate: number;
}

export interface SanitizedGenerationText {
  redactionCount: number;
  truncated: boolean;
  value: string;
}

const SENSITIVE_PATTERNS: RegExp[] = [
  /data:[^,\s]+;base64,[^\s"')]+/gi,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bapi[_-]?key\s*[=:]\s*\S+/gi,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /(?<!\d)1[3-9]\d{9}(?!\d)/g,
  /(?<!\d)\d{17}[\dXx](?!\d)/g,
  /(?:\/(?:home|Users|var|tmp)\/|[A-Za-z]:\\)[^\s"'<>]+/g,
];

/** 正文进入持久化层前执行确定性脱敏和字符上限控制。 */
export function sanitizeGenerationText(
  input: string,
  maxCharacters: number,
): SanitizedGenerationText {
  let redactionCount = 0;
  let value = input;

  for (const pattern of SENSITIVE_PATTERNS) {
    value = value.replace(pattern, () => {
      redactionCount += 1;

      return '[已脱敏]';
    });
  }

  const truncated = value.length > maxCharacters;

  return {
    redactionCount,
    truncated,
    value: truncated ? value.slice(0, maxCharacters) : value,
  };
}

export function sanitizeGenerationMessages(
  messages: ObservabilityGenerationMessage[],
  maxCharacters: number,
): {
  messages: ObservabilityGenerationMessage[];
  redactionCount: number;
  truncated: boolean;
} {
  let remaining = maxCharacters;
  let redactionCount = 0;
  let truncated = false;
  const sanitized = messages.map((message) => {
    const result = sanitizeGenerationText(
      message.content,
      Math.max(0, remaining),
    );

    remaining -= result.value.length;
    redactionCount += result.redactionCount;
    truncated ||= result.truncated;

    return {
      content: result.value,
      role: message.role,
    };
  });

  return { messages: sanitized, redactionCount, truncated };
}
