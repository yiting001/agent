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
  /** 0-100 的摄取进度。 */
  progress: number;
  startedAt?: Date;
  status: IngestionJobStatus;
}
