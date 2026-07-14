import { createHash, randomUUID } from 'node:crypto';

/** 情景记忆先提取文本，再写入向量索引。 */
export type AgentMemoryTaskKind = 'extract' | 'index';
/** 可重试任务的持久化状态；超过上限后进入 dead。 */
export type AgentMemoryTaskStatus =
  | 'dead'
  | 'processing'
  | 'queued'
  | 'succeeded';

/** 支持租约、重试和故障恢复的情景记忆任务。 */
export interface AgentMemoryTask {
  agentId: string;
  /** 当前任务已经领取的次数。 */
  attempts: number;
  completedAt?: Date;
  createdAt: Date;
  /** extract 阶段暂存的向量，供 index 阶段消费。 */
  embedding?: number[];
  embeddingDimensions?: number;
  id: string;
  kind: AgentMemoryTaskKind;
  lastError?: string;
  /** 当前租约的领取时间。 */
  lockedAt?: Date;
  /** 当前租约持有者；完成任务时必须匹配。 */
  lockOwner?: string;
  /** 允许的最大领取次数。 */
  maxAttempts: number;
  memoryId: string;
  /** 指数退避后允许再次领取的时间。 */
  nextRunAt: Date;
  /** 所有任务读写都必须使用的隔离键。 */
  ownerKey: string;
  status: AgentMemoryTaskStatus;
  updatedAt: Date;
}

/** 管理端任务列表使用的序列化视图。 */
export interface AgentMemoryTaskSummary {
  attempts: number;
  completedAt?: string;
  embeddingDimensions?: number;
  id: string;
  kind: AgentMemoryTaskKind;
  lastError?: string;
  lockedAt?: string;
  maxAttempts: number;
  memoryId: string;
  nextRunAt: string;
  status: AgentMemoryTaskStatus;
  updatedAt: string;
}

const MAX_ERROR_LENGTH = 500;
const MAX_BACKOFF_MS = 5 * 60 * 1_000;

/** 基于智能体、所有者、会话、附件和用户内容生成稳定幂等键。 */
export function buildEpisodeIdempotencyKey(input: {
  agentId: string;
  attachmentIds: string[];
  conversationId?: string;
  ownerKey: string;
  userContent: string;
}): string {
  const userHash = createHash('sha256')
    .update(input.userContent.trim())
    .digest('hex');
  const value = [
    input.agentId,
    input.ownerKey,
    input.conversationId ?? '',
    [...input.attachmentIds].sort().join(','),
    userHash,
  ].join('|');

  return createHash('sha256').update(value).digest('hex');
}

/** 为当前进程生成可追踪且跨进程不冲突的租约持有者。 */
export function createLockOwner(): string {
  return `agent-memory-${process.pid}-${randomUUID()}`;
}

/** 计算带五分钟上限的指数退避重试时间。 */
export function resolveNextRunAt(input: {
  attempts: number;
  baseDelayMs: number;
  now: Date;
}): Date {
  const exponent = Math.max(0, input.attempts - 1);
  const delay = Math.min(
    MAX_BACKOFF_MS,
    input.baseDelayMs * 2 ** Math.min(exponent, 10),
  );

  return new Date(input.now.getTime() + delay);
}

/** 清洗错误中的密钥、base64 和本地路径，并限制持久化长度。 */
export function sanitizeTaskError(error: unknown): string {
  const message = error instanceof Error ? error.message : '未知错误';

  return message
    .replace(/data:[^,\s]+;base64,[^\s"]+/g, '[redacted-base64]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '[redacted-key]')
    .replace(/\bapi[_-]?key\s*[=:]\s*\S+/gi, 'api-key=[redacted]')
    .replace(/[A-Za-z]:\\(?:[^\\\s]+\\)+[^\\\s]*/g, '[redacted-path]')
    .replace(/(?:\/[A-Za-z0-9._-]+){2,}/g, '[redacted-path]')
    .slice(0, MAX_ERROR_LENGTH);
}

/** 将任务实体转换为管理端可序列化视图。 */
export function toAgentMemoryTaskSummary(
  task: AgentMemoryTask,
): AgentMemoryTaskSummary {
  return {
    attempts: task.attempts,
    completedAt: task.completedAt?.toISOString(),
    embeddingDimensions: task.embeddingDimensions,
    id: task.id,
    kind: task.kind,
    lastError: task.lastError,
    lockedAt: task.lockedAt?.toISOString(),
    maxAttempts: task.maxAttempts,
    memoryId: task.memoryId,
    nextRunAt: task.nextRunAt.toISOString(),
    status: task.status,
    updatedAt: task.updatedAt.toISOString(),
  };
}
