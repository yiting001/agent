import type { KnowledgeDocument } from '../domain/knowledge';
import type {
  IngestionJob,
  UploadPart,
  UploadSession,
} from '../domain/knowledge-upload';

/** 分片上传和摄取任务的事务持久化端口。 */
export abstract class KnowledgeUploadRepository {
  /** 使用行锁跳过已领取任务，并写入新的 lockOwner 租约。 */
  abstract claimNextJob(input: {
    lockOwner: string;
    now: Date;
  }): Promise<IngestionJob | undefined>;
  /** 仅由当前租约持有者原子完成文档和摄取任务。 */
  abstract completeJob(
    job: IngestionJob,
    document: KnowledgeDocument,
  ): Promise<boolean>;
  /** 在同一事务内完成会话、创建文档并入队摄取任务。 */
  abstract completeUpload(
    session: UploadSession,
    document: KnowledgeDocument,
    job: IngestionJob,
  ): Promise<void>;
  abstract findDocument(id: string): Promise<KnowledgeDocument | undefined>;
  abstract findPart(
    uploadSessionId: string,
    partNumber: number,
  ): Promise<UploadPart | undefined>;
  abstract findSession(id: string): Promise<UploadSession | undefined>;
  /** 仅由当前租约持有者将任务重排队或终止。 */
  abstract failJob(input: {
    dead: boolean;
    document?: KnowledgeDocument;
    errorMessage: string;
    job: IngestionJob;
    nextRunAt: Date;
    now: Date;
  }): Promise<boolean>;
  abstract listParts(uploadSessionId: string): Promise<UploadPart[]>;
  /** 保存分片并原子更新会话已接收字节数。 */
  abstract savePart(part: UploadPart, receivedBytes: number): Promise<void>;
  abstract saveSession(session: UploadSession): Promise<void>;
  /** 将过期 processing 租约恢复为 queued 或 failed。 */
  abstract reclaimExpired(input: {
    lockTimeoutMs: number;
    now: Date;
  }): Promise<number>;
  /** 在当前租约有效时标记文档开始处理并清理旧错误。 */
  abstract startJob(
    job: IngestionJob,
    document: KnowledgeDocument,
  ): Promise<boolean>;
  /** 原子写入进度并续租；false 表示租约已丢失。 */
  abstract updateJobProgress(
    job: IngestionJob,
    progress: number,
    now: Date,
  ): Promise<boolean>;
}
