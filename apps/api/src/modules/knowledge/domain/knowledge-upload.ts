import { createHash, randomUUID } from 'node:crypto';

/** 分片上传会话在完成合并前保持 open。 */
export type UploadSessionStatus = 'completed' | 'open';
/** 文档摄取任务的持久化状态。 */
export type IngestionJobStatus =
  | 'completed'
  | 'failed'
  | 'processing'
  | 'queued';

/** 支持断点续传的分片上传会话。 */
export interface UploadSession {
  /** 服务端要求的单分片大小，最后一片可以更小。 */
  chunkSizeBytes: number;
  createdAt: Date;
  expectedParts: number;
  /** 会话过期后不再接受新分片。 */
  expiresAt: Date;
  fileName: string;
  id: string;
  mimeType: string;
  moduleId: string;
  /** 已持久化分片的累计字节数。 */
  receivedBytes: number;
  status: UploadSessionStatus;
  totalBytes: number;
}

/** 已落盘的单个上传分片。 */
export interface UploadPart {
  id: string;
  partNumber: number;
  /** 分片内容摘要，用于校验重复上传的一致性。 */
  sha256: string;
  sizeBytes: number;
  storageKey: string;
  uploadSessionId: string;
}

/** 上传进度查询使用的序列化视图。 */
export interface UploadSessionSummary {
  chunkSizeBytes: number;
  expectedParts: number;
  expiresAt: string;
  fileName: string;
  id: string;
  mimeType: string;
  receivedBytes: number;
  status: UploadSessionStatus;
  totalBytes: number;
  uploadedParts: number[];
}

/** 驱动文本抽取、切片、嵌入和索引写入的持久化任务。 */
export interface IngestionJob {
  /** 已执行次数；领取任务时递增。 */
  attempts: number;
  completedAt?: Date;
  createdAt: Date;
  documentId: string;
  errorMessage?: string;
  id: string;
  /** 当前租约的领取时间。 */
  lockedAt?: Date;
  /** 当前租约持有者；完成和失败更新时必须匹配。 */
  lockOwner?: string;
  /** 允许的最大领取次数。 */
  maxAttempts: number;
  /** 退避结束后允许再次领取的时间。 */
  nextRunAt: Date;
  /** 0-100 的摄取进度。 */
  progress: number;
  startedAt?: Date;
  status: IngestionJobStatus;
  updatedAt: Date;
}

const MAX_INGESTION_ERROR_LENGTH = 500;
const MAX_INGESTION_BACKOFF_MS = 5 * 60_000;

/** 为当前进程生成跨 worker 不冲突的摄取租约持有者。 */
export function createIngestionLockOwner(): string {
  return `knowledge-ingestion-${process.pid}-${randomUUID()}`;
}

/** 为同一文档切片生成重试稳定的向量主键。 */
export function buildKnowledgeChunkId(
  documentId: string,
  chunkIndex: number,
): string {
  return createHash('sha256')
    .update(`${documentId}:${chunkIndex}`)
    .digest('hex');
}

/** 计算带五分钟上限的指数退避时间。 */
export function resolveIngestionNextRunAt(input: {
  attempts: number;
  baseDelayMs: number;
  now: Date;
}): Date {
  const exponent = Math.max(0, input.attempts - 1);
  const delay = Math.min(
    MAX_INGESTION_BACKOFF_MS,
    input.baseDelayMs * 2 ** Math.min(exponent, 10),
  );

  return new Date(input.now.getTime() + delay);
}

/** 清洗摄取异常中的密钥、base64 和内部路径。 */
export function sanitizeIngestionError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : '文档处理发生未知错误。';

  return message
    .replace(/data:[^,\s]+;base64,[^\s"]+/g, '[redacted-base64]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '[redacted-key]')
    .replace(/\bapi[_-]?key\s*[=:]\s*\S+/gi, 'api-key=[redacted]')
    .replace(/[A-Za-z]:\\(?:[^\\\s]+\\)+[^\\\s]*/g, '[redacted-path]')
    .replace(/(?:\/[A-Za-z0-9._-]+){2,}/g, '[redacted-path]')
    .slice(0, MAX_INGESTION_ERROR_LENGTH);
}
