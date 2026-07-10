import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { KnowledgeUploadRepository } from '../../application/knowledge-upload.repository';
import type { KnowledgeDocument } from '../../domain/knowledge';
import type {
  IngestionJob,
  UploadPart,
  UploadSession,
} from '../../domain/knowledge-upload';
import { IngestionJobEntity } from './ingestion-job.entity';
import { KnowledgeDocumentEntity } from './knowledge-document.entity';
import { UploadPartEntity } from './upload-part.entity';
import { UploadSessionEntity } from './upload-session.entity';

@Injectable()
export class TypeOrmKnowledgeUploadRepository extends KnowledgeUploadRepository {
  constructor(
    @InjectRepository(UploadSessionEntity)
    private readonly sessions: Repository<UploadSessionEntity>,
    @InjectRepository(UploadPartEntity)
    private readonly parts: Repository<UploadPartEntity>,
    @InjectRepository(KnowledgeDocumentEntity)
    private readonly documents: Repository<KnowledgeDocumentEntity>,
    @InjectRepository(IngestionJobEntity)
    private readonly jobs: Repository<IngestionJobEntity>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async claimNextJob(): Promise<IngestionJob | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(IngestionJobEntity);
      const job = await repository.findOne({
        order: { createdAt: 'ASC' },
        where: { status: 'queued' },
      });

      if (!job) {
        return undefined;
      }

      const startedAt = new Date();
      const claimed = {
        ...job,
        attempts: job.attempts + 1,
        progress: 1,
        startedAt,
        status: 'processing' as const,
      };

      await repository.save(claimed);

      return claimed;
    });
  }

  async completeUpload(
    session: UploadSession,
    document: KnowledgeDocument,
    job: IngestionJob,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(UploadSessionEntity).save(session);
      await manager.getRepository(KnowledgeDocumentEntity).save(document);
      await manager.getRepository(IngestionJobEntity).save(job);
    });
  }

  async findDocument(id: string): Promise<KnowledgeDocument | undefined> {
    const document = await this.documents.findOneBy({ id });

    return document ? { ...document } : undefined;
  }

  async findPart(
    uploadSessionId: string,
    partNumber: number,
  ): Promise<UploadPart | undefined> {
    const part = await this.parts.findOneBy({
      partNumber,
      uploadSessionId,
    });

    return part ? { ...part } : undefined;
  }

  async findSession(id: string): Promise<UploadSession | undefined> {
    const session = await this.sessions.findOneBy({ id });

    return session ? { ...session } : undefined;
  }

  async listParts(uploadSessionId: string): Promise<UploadPart[]> {
    const parts = await this.parts.find({
      order: { partNumber: 'ASC' },
      where: { uploadSessionId },
    });

    return parts.map((part) => ({ ...part }));
  }

  async savePart(part: UploadPart, receivedBytes: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(UploadPartEntity).save(part);
      await manager
        .getRepository(UploadSessionEntity)
        .update(part.uploadSessionId, { receivedBytes });
    });
  }

  async saveSession(session: UploadSession): Promise<void> {
    await this.sessions.save(session);
  }

  async updateDocument(document: KnowledgeDocument): Promise<void> {
    await this.documents.save(document);
  }

  async updateJob(job: IngestionJob): Promise<void> {
    await this.jobs.save(job);
  }
}
