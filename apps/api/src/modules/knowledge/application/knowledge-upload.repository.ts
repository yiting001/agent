import type { KnowledgeDocument } from '../domain/knowledge';
import type {
  IngestionJob,
  UploadPart,
  UploadSession,
} from '../domain/knowledge-upload';

/** 分片上传和摄取任务的事务持久化端口。 */
export abstract class KnowledgeUploadRepository {
  /** 并发安全地领取一个 queued 任务；无可用任务时返回 undefined。 */
  abstract claimNextJob(): Promise<IngestionJob | undefined>;
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
  abstract listParts(uploadSessionId: string): Promise<UploadPart[]>;
  /** 保存分片并原子更新会话已接收字节数。 */
  abstract savePart(part: UploadPart, receivedBytes: number): Promise<void>;
  abstract saveSession(session: UploadSession): Promise<void>;
  abstract updateDocument(document: KnowledgeDocument): Promise<void>;
  abstract updateJob(job: IngestionJob): Promise<void>;
}
