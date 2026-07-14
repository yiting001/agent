import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { unwrapPostgresRows } from '../../../../shared/infrastructure/postgres/postgres-query-result';
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

/** 使用 PostgreSQL 事务实现分片上传和知识摄取任务持久化。 */
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

  /** 使用 FOR UPDATE SKIP LOCKED 领取到期任务并写入独占租约。 */
  async claimNextJob(input: {
    lockOwner: string;
    now: Date;
  }): Promise<IngestionJob | undefined> {
    const result: unknown = await this.dataSource.query(
      `
        WITH next_job AS (
          SELECT "id"
          FROM "knowledge_ingestion_jobs"
          WHERE "status" = 'queued' AND "nextRunAt" <= $1
          ORDER BY "nextRunAt" ASC, "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE "knowledge_ingestion_jobs" AS job
        SET
          "attempts" = job."attempts" + 1,
          "lockedAt" = $1,
          "lockOwner" = $2,
          "progress" = 1,
          "startedAt" = $1,
          "status" = 'processing',
          "updatedAt" = $1
        FROM next_job
        WHERE job."id" = next_job."id"
        RETURNING job.*
      `,
      [input.now, input.lockOwner],
    );
    const rows = unwrapPostgresRows<IngestionJobEntity>(result);
    const job = rows[0];

    return job ? { ...job } : undefined;
  }

  /** 当前租约仍有效时，在同一事务内完成文档和任务。 */
  async completeJob(
    job: IngestionJob,
    document: KnowledgeDocument,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const result: unknown = await manager.query(
        `
          UPDATE "knowledge_ingestion_jobs"
          SET
            "completedAt" = $1,
            "errorMessage" = NULL,
            "lockedAt" = NULL,
            "lockOwner" = NULL,
            "progress" = 100,
            "status" = 'completed',
            "updatedAt" = $1
          WHERE
            "id" = $2
            AND "status" = 'processing'
            AND "lockOwner" = $3
          RETURNING "id"
        `,
        [document.updatedAt, job.id, job.lockOwner],
      );
      const updated = unwrapPostgresRows<{ id: string }>(result);

      if (updated.length !== 1) {
        return false;
      }

      await manager.getRepository(KnowledgeDocumentEntity).save(document);

      return true;
    });
  }

  /** 上传会话完成、文档入库和 ingestion 入队共享同一事务。 */
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

  /** 仅当前租约持有者可重排队；终止时同时标记文档失败。 */
  async failJob(input: {
    dead: boolean;
    document?: KnowledgeDocument;
    errorMessage: string;
    job: IngestionJob;
    nextRunAt: Date;
    now: Date;
  }): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const result: unknown = await manager.query(
        `
          UPDATE "knowledge_ingestion_jobs"
          SET
            "completedAt" = CASE
              WHEN $1::boolean THEN $2::timestamptz
              ELSE NULL::timestamptz
            END,
            "errorMessage" = $3,
            "lockedAt" = NULL,
            "lockOwner" = NULL,
            "nextRunAt" = $4,
            "status" = CASE
              WHEN $1::boolean THEN 'failed'
              ELSE 'queued'
            END,
            "updatedAt" = $2
          WHERE
            "id" = $5
            AND "status" = 'processing'
            AND "lockOwner" = $6
          RETURNING "id"
        `,
        [
          input.dead,
          input.now,
          input.errorMessage,
          input.nextRunAt,
          input.job.id,
          input.job.lockOwner,
        ],
      );
      const updated = unwrapPostgresRows<{ id: string }>(result);

      if (updated.length !== 1) {
        return false;
      }

      if (input.document) {
        input.document.errorMessage = input.errorMessage;
        input.document.status = input.dead ? 'failed' : 'queued';
        input.document.updatedAt = input.now;

        await manager
          .getRepository(KnowledgeDocumentEntity)
          .save(input.document);
      }

      return true;
    });
  }

  async listParts(uploadSessionId: string): Promise<UploadPart[]> {
    const parts = await this.parts.find({
      order: { partNumber: 'ASC' },
      where: { uploadSessionId },
    });

    return parts.map((part) => ({ ...part }));
  }

  /** 分片元数据和会话 receivedBytes 在同一事务中更新。 */
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

  /** 回收过期租约；达到上限的任务和文档进入 failed。 */
  async reclaimExpired(input: {
    lockTimeoutMs: number;
    now: Date;
  }): Promise<number> {
    const expiredBefore = new Date(input.now.getTime() - input.lockTimeoutMs);

    return this.dataSource.transaction(async (manager) => {
      const result: unknown = await manager.query(
        `
          WITH expired AS (
            SELECT "id"
            FROM "knowledge_ingestion_jobs"
            WHERE
              "status" = 'processing'
              AND "lockedAt" IS NOT NULL
              AND "lockedAt" <= $1
            FOR UPDATE SKIP LOCKED
          )
          UPDATE "knowledge_ingestion_jobs" AS job
          SET
            "completedAt" = CASE
              WHEN job."attempts" >= job."maxAttempts"
                THEN $2::timestamptz
              ELSE NULL::timestamptz
            END,
            "errorMessage" = CASE
              WHEN job."attempts" >= job."maxAttempts"
                THEN '摄取租约超时且已达到最大尝试次数。'
              ELSE '摄取租约超时，任务已重新排队。'
            END,
            "lockedAt" = NULL,
            "lockOwner" = NULL,
            "nextRunAt" = $2,
            "status" = CASE
              WHEN job."attempts" >= job."maxAttempts" THEN 'failed'
              ELSE 'queued'
            END,
            "updatedAt" = $2
          FROM expired
          WHERE job."id" = expired."id"
          RETURNING job."documentId", job."errorMessage", job."status"
        `,
        [expiredBefore, input.now],
      );
      const rows = unwrapPostgresRows<{
        documentId: string;
        errorMessage: string;
        status: IngestionJob['status'];
      }>(result);
      for (const row of rows) {
        await manager.getRepository(KnowledgeDocumentEntity).update(
          { id: row.documentId },
          {
            errorMessage: row.errorMessage,
            status: row.status === 'failed' ? 'failed' : 'queued',
            updatedAt: input.now,
          },
        );
      }

      return rows.length;
    });
  }

  /** 当前租约仍有效时将文档置为 processing。 */
  async startJob(
    job: IngestionJob,
    document: KnowledgeDocument,
  ): Promise<boolean> {
    const result: unknown = await this.dataSource.query(
      `
        UPDATE "knowledge_documents" AS document
        SET
          "errorMessage" = NULL,
          "status" = 'processing',
          "updatedAt" = $1
        WHERE
          document."id" = $2
          AND EXISTS (
            SELECT 1
            FROM "knowledge_ingestion_jobs" AS job
            WHERE
              job."id" = $3
              AND job."status" = 'processing'
              AND job."lockOwner" = $4
          )
        RETURNING document."id"
      `,
      [document.updatedAt, document.id, job.id, job.lockOwner],
    );

    return unwrapPostgresRows<{ id: string }>(result).length === 1;
  }

  /** 原子更新进度和续租，避免过期 worker 覆盖新 owner。 */
  async updateJobProgress(
    job: IngestionJob,
    progress: number,
    now: Date,
  ): Promise<boolean> {
    const result = await this.jobs.update(
      {
        id: job.id,
        lockOwner: job.lockOwner,
        status: 'processing',
      },
      {
        lockedAt: now,
        progress,
        updatedAt: now,
      },
    );

    return (result.affected ?? 0) === 1;
  }
}
