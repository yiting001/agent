import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import type { ApplicationConfig } from '../../../config/application.config';
import { ModelGateway } from '../../model-providers/application/model-gateway';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import type { IngestionJob } from '../domain/knowledge-upload';
import { DocumentTextExtractor } from './document-text-extractor';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { KnowledgeObjectStorage } from './knowledge-object-storage';
import { KnowledgeUploadRepository } from './knowledge-upload.repository';
import { TextChunker } from './text-chunker';
import { VectorIndex } from './vector-index';

@Injectable()
export class ProcessNextIngestionJobUseCase {
  private readonly batchSize: number;
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

    this.batchSize = config.embeddingBatchSize;
    this.maxDocumentBytes = config.knowledgeMaxDocumentBytes;
  }

  async execute(): Promise<boolean> {
    const job = await this.repository.claimNextJob();

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

  private async process(job: IngestionJob): Promise<void> {
    const document = await this.repository.findDocument(job.documentId);

    if (!document) {
      throw new Error('待处理文档不存在。');
    }

    document.status = 'processing';
    document.updatedAt = new Date();
    await this.repository.updateDocument(document);

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

    await this.vectorIndex.ensureCollection(knowledgeBase);

    for (let offset = 0; offset < chunks.length; offset += this.batchSize) {
      const batch = chunks.slice(offset, offset + this.batchSize);
      const embeddings = await this.modelGateway.embed({
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        dimensions: knowledgeBase.embeddingDimensions,
        input: batch.map((chunk) => chunk.content),
        model: knowledgeBase.embeddingModel,
      });

      await this.vectorIndex.upsert(
        knowledgeBase,
        batch.map((chunk, index) => ({
          chunkIndex: chunk.index,
          content: chunk.content,
          documentId: document.id,
          fileName: document.fileName,
          id: randomUUID(),
          moduleId: document.moduleId,
          vector: embeddings[index] ?? [],
        })),
      );

      job.progress = Math.min(
        99,
        Math.round(((offset + batch.length) / chunks.length) * 100),
      );
      await this.repository.updateJob(job);
    }

    const completedAt = new Date();

    document.chunkCount = chunks.length;
    document.status = 'ready';
    document.updatedAt = completedAt;
    job.completedAt = completedAt;
    job.progress = 100;
    job.status = 'completed';

    await this.repository.updateDocument(document);
    await this.repository.updateJob(job);
  }

  private async fail(job: IngestionJob, error: unknown): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.message : '文档处理发生未知错误。';
    const document = await this.repository.findDocument(job.documentId);
    const completedAt = new Date();

    if (document) {
      document.errorMessage = errorMessage;
      document.status = 'failed';
      document.updatedAt = completedAt;
      await this.repository.updateDocument(document);
    }

    job.completedAt = completedAt;
    job.errorMessage = errorMessage;
    job.status = 'failed';
    await this.repository.updateJob(job);
  }
}
