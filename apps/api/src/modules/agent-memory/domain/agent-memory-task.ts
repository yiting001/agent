import { createHash, randomUUID } from 'node:crypto';

export type AgentMemoryTaskKind = 'extract' | 'index';
export type AgentMemoryTaskStatus =
  | 'dead'
  | 'processing'
  | 'queued'
  | 'succeeded';

export interface AgentMemoryTask {
  agentId: string;
  attempts: number;
  completedAt?: Date;
  createdAt: Date;
  embedding?: number[];
  embeddingDimensions?: number;
  id: string;
  kind: AgentMemoryTaskKind;
  lastError?: string;
  lockedAt?: Date;
  lockOwner?: string;
  maxAttempts: number;
  memoryId: string;
  nextRunAt: Date;
  ownerKey: string;
  status: AgentMemoryTaskStatus;
  updatedAt: Date;
}

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

export function createLockOwner(): string {
  return `agent-memory-${process.pid}-${randomUUID()}`;
}

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
