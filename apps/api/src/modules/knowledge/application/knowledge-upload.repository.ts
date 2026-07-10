import type { KnowledgeDocument } from '../domain/knowledge';
import type {
  IngestionJob,
  UploadPart,
  UploadSession,
} from '../domain/knowledge-upload';

export abstract class KnowledgeUploadRepository {
  abstract claimNextJob(): Promise<IngestionJob | undefined>;
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
  abstract savePart(part: UploadPart, receivedBytes: number): Promise<void>;
  abstract saveSession(session: UploadSession): Promise<void>;
  abstract updateDocument(document: KnowledgeDocument): Promise<void>;
  abstract updateJob(job: IngestionJob): Promise<void>;
}
