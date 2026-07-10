import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import type { ApplicationConfig } from '../../../config/application.config';
import type { UploadSessionSummary } from '../domain/knowledge-upload';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { KnowledgeUploadRepository } from './knowledge-upload.repository';

const ALLOWED_EXTENSIONS = new Set([
  '.csv',
  '.docx',
  '.htm',
  '.html',
  '.json',
  '.markdown',
  '.md',
  '.pdf',
  '.txt',
]);
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1_000;

export interface CreateUploadSessionCommand {
  fileName: string;
  mimeType: string;
  moduleId: string;
  totalBytes: number;
}

@Injectable()
export class CreateUploadSessionUseCase {
  constructor(
    private readonly catalog: KnowledgeCatalogService,
    private readonly repository: KnowledgeUploadRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: CreateUploadSessionCommand,
  ): Promise<UploadSessionSummary> {
    await this.catalog.getModule(command.moduleId);

    const extension = extname(command.fileName).toLowerCase();
    const config =
      this.configService.getOrThrow<ApplicationConfig>('application');

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new ApplicationError(
        'invalid_operation',
        '仅支持 TXT、Markdown、PDF、DOCX、HTML、CSV 和 JSON 文件。',
      );
    }

    if (command.totalBytes > config.knowledgeMaxDocumentBytes) {
      throw new ApplicationError(
        'invalid_operation',
        `单文件不能超过 ${config.knowledgeMaxDocumentBytes} 字节。`,
      );
    }

    const createdAt = new Date();
    const session = {
      chunkSizeBytes: config.knowledgeUploadChunkBytes,
      createdAt,
      expectedParts: Math.ceil(
        command.totalBytes / config.knowledgeUploadChunkBytes,
      ),
      expiresAt: new Date(createdAt.getTime() + SESSION_LIFETIME_MS),
      fileName: command.fileName,
      id: randomUUID(),
      mimeType: command.mimeType,
      moduleId: command.moduleId,
      receivedBytes: 0,
      status: 'open' as const,
      totalBytes: command.totalBytes,
    };

    await this.repository.saveSession(session);

    return {
      chunkSizeBytes: session.chunkSizeBytes,
      expectedParts: session.expectedParts,
      expiresAt: session.expiresAt.toISOString(),
      fileName: session.fileName,
      id: session.id,
      mimeType: session.mimeType,
      receivedBytes: 0,
      status: 'open',
      totalBytes: session.totalBytes,
      uploadedParts: [],
    };
  }
}
