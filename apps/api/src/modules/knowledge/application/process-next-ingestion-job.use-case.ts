import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ModelGateway } from '../../model-providers/application/model-gateway';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import {
  buildKnowledgeChunkId,
  createIngestionLockOwner,
  type IngestionJob,
  resolveIngestionNextRunAt,
  sanitizeIngestionError,
} from '../domain/knowledge-upload';
import { DocumentTextExtractor } from './document-text-extractor';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { KnowledgeObjectStorage } from './knowledge-object-storage';
import { KnowledgeUploadRepository } from './knowledge-upload.repository';
import { TextChunker } from './text-chunker';
import { VectorIndex } from './vector-index';

/** 领取并完成一个知识文档摄取任务的应用用例。 */
@Injectable()
export class ProcessNextIngestionJobUseCase {
  private readonly backoffBaseMs: number;
  private readonly batchSize: number;
  private readonly lockTimeoutMs: number;
  private readonly maxDocumentBytes: number;

  constructor(
    private readonly repository: KnowledgeUploadRepository,
    private readonly catalog: KnowledgeCatalogService,
    private readonly storage: KnowledgeObjectStorage,
    private readonly extractor: DocumentTextExtractor,
    private readonly chunker: TextChunker,
    private readonly modelProviders: ModelProviderRuntimeService,
    private readonly modelGateway: ModelGateway,
    private readonly vectorIndex: VectorIndex,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.backoffBaseMs = config.ingestionBackoffBaseMs;
    this.batchSize = config.embeddingBatchSize;
    this.lockTimeoutMs = config.ingestionLockTimeoutMs;
    this.maxDocumentBytes = config.knowledgeMaxDocumentBytes;
  }

  /** 回收进程中断遗留的过期 processing 租约。 */
  reclaimExpired(): Promise<number> {
    return this.repository.reclaimExpired({
      lockTimeoutMs: this.lockTimeoutMs,
      now: new Date(),
    });
  }

  /** 无任务时返回 false，便于调度器排空队列后停止当前 tick。 */
  async execute(): Promise<boolean> {
    const job = await this.repository.claimNextJob({
      lockOwner: createIngestionLockOwner(),
      now: new Date(),
    });

    if (!job) {
      return false;
    }

    try {
      await this.process(job);
    } catch (error) {
      await this.fail(job, error);
    }

    return true;
  }

  /** 按读取、抽取、切片、嵌入、索引顺序推进文档状态。 */
  private async process(job: IngestionJob): Promise<void> {
    const document = await this.repository.findDocument(job.documentId);

    if (!document) {
      throw new Error('待处理文档不存在。');
    }

    document.status = 'processing';
    document.errorMessage = undefined;
    document.updatedAt = new Date();

    if (!(await this.repository.startJob(job, document))) {
      return;
    }

    const module = await this.catalog.getModule(document.moduleId);
    const knowledgeBase = await this.catalog.getBase(module.knowledgeBaseId);
    const content = await this.storage.readBuffer(
      document.storageKey,
      this.maxDocumentBytes,
    );
    const text = await this.extractor.extract(document.fileName, content);
    const chunks = this.chunker.split(text);

    if (chunks.length === 0) {
      throw new Error('文档中没有可索引文本。');
    }

    const provider = await this.modelProviders.get(
      knowledgeBase.embeddingProviderId,
    );

    if (!provider.embeddingModel || !provider.embeddingDimensions) {
      throw new Error('知识库的嵌入模型配置不完整。');
    }

    await this.vectorIndex.deleteDocuments(knowledgeBase, [document.id]);
    await this.vectorIndex.ensureCollection(knowledgeBase);

    for (let offset = 0; offset < chunks.length; offset += this.batchSize) {
      const batch = chunks.slice(offset, offset + this.batchSize);

      await this.assertLease(job, job.progress);
      const embeddings = await this.modelGateway.embed({
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        dimensions: knowledgeBase.embeddingDimensions,
        inputCostPerMillionTokens: provider.embeddingInputCostPerMillionTokens,
        input: batch.map((chunk) => chunk.content),
        model: knowledgeBase.embeddingModel,
        operation: 'embedding.document_ingestion',
        providerId: provider.id,
      });

      await this.assertLease(job, job.progress);
      await this.vectorIndex.upsert(
        knowledgeBase,
        batch.map((chunk, index) => ({
          chunkIndex: chunk.index,
          content: chunk.content,
          documentId: document.id,
          fileName: document.fileName,
          id: buildKnowledgeChunkId(document.id, chunk.index),
          moduleId: document.moduleId,
          vector: embeddings[index] ?? [],
        })),
      );

      const progress = Math.min(
        99,
        Math.round(((offset + batch.length) / chunks.length) * 100),
      );

      await this.assertLease(job, progress);
      job.progress = progress;
    }

    const completedAt = new Date();

    document.chunkCount = chunks.length;
    document.errorMessage = undefined;
    document.status = 'ready';
    document.updatedAt = completedAt;

    await this.repository.completeJob(job, document);
  }

  /** 按最大次数重排队或终止，并仅允许当前租约持有者更新。 */
  private async fail(job: IngestionJob, error: unknown): Promise<void> {
    const errorMessage = sanitizeIngestionError(error);
    const document = await this.repository.findDocument(job.documentId);
    const now = new Date();
    const dead = job.attempts >= job.maxAttempts;

    await this.repository.failJob({
      dead,
      document,
      errorMessage,
      job,
      nextRunAt: dead
        ? job.nextRunAt
        : resolveIngestionNextRunAt({
            attempts: job.attempts,
            baseDelayMs: this.backoffBaseMs,
            now,
          }),
      now,
    });
  }

  /** 进度写入同时续租；失败表示该 worker 已失去任务所有权。 */
  private async assertLease(
    job: IngestionJob,
    progress: number,
  ): Promise<void> {
    if (!(await this.repository.updateJobProgress(job, progress, new Date()))) {
      throw new Error('摄取任务租约已失效。');
    }
  }
}
