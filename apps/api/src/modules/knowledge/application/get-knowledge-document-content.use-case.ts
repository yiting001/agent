import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import type { KnowledgeDocumentContent } from '../domain/knowledge';
import { DocumentTextExtractor } from './document-text-extractor';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';
import { KnowledgeObjectStorage } from './knowledge-object-storage';

@Injectable()
export class GetKnowledgeDocumentContentUseCase {
  private readonly maxDocumentBytes: number;
  private readonly previewMaxChars: number;

  constructor(
    private readonly repository: KnowledgeCatalogRepository,
    private readonly objectStorage: KnowledgeObjectStorage,
    private readonly extractor: DocumentTextExtractor,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.maxDocumentBytes = config.knowledgeMaxDocumentBytes;
    this.previewMaxChars = config.knowledgePreviewMaxChars;
  }

  async execute(id: string): Promise<KnowledgeDocumentContent> {
    const document = await this.repository.findDocument(id);

    if (!document) {
      throw new ApplicationError('not_found', '知识文档不存在。');
    }

    if (document.status !== 'ready') {
      throw new ApplicationError('conflict', '文档尚未处理完成，暂无法预览。');
    }

    const buffer = await this.objectStorage.readBuffer(
      document.storageKey,
      this.maxDocumentBytes,
    );
    const text = await this.extractor.extract(document.fileName, buffer);
    const truncated = text.length > this.previewMaxChars;

    return {
      content: truncated ? text.slice(0, this.previewMaxChars) : text,
      fileName: document.fileName,
      id: document.id,
      mimeType: document.mimeType,
      truncated,
    };
  }
}
