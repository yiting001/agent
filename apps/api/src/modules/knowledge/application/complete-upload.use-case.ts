import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import type { KnowledgeDocument } from '../domain/knowledge';
import { KnowledgeObjectStorage } from './knowledge-object-storage';
import { KnowledgeUploadRepository } from './knowledge-upload.repository';

@Injectable()
export class CompleteUploadUseCase {
  private readonly maxAttempts: number;

  constructor(
    private readonly repository: KnowledgeUploadRepository,
    private readonly storage: KnowledgeObjectStorage,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.maxAttempts = config.ingestionMaxAttempts;
  }

  async execute(
    uploadSessionId: string,
    expectedSha256?: string,
  ): Promise<KnowledgeDocument> {
    const [session, parts] = await Promise.all([
      this.repository.findSession(uploadSessionId),
      this.repository.listParts(uploadSessionId),
    ]);

    if (!session || session.status !== 'open') {
      throw new ApplicationError('not_found', '上传会话不存在或已经完成。');
    }

    const orderedParts = parts.sort(
      (left, right) => left.partNumber - right.partNumber,
    );
    const complete =
      orderedParts.length === session.expectedParts &&
      orderedParts.every((part, index) => part.partNumber === index + 1) &&
      orderedParts.reduce((total, part) => total + part.sizeBytes, 0) ===
        session.totalBytes;

    if (!complete) {
      throw new ApplicationError('conflict', '文件分片尚未全部上传。');
    }

    const documentId = randomUUID();
    const storageKey = `documents/${session.moduleId}/${documentId}`;
    const stored = await this.storage.combine(
      storageKey,
      orderedParts.map((part) => part.storageKey),
    );

    if (expectedSha256 && stored.sha256 !== expectedSha256.toLowerCase()) {
      await this.storage.deleteMany([storageKey]);
      throw new ApplicationError('invalid_operation', '文件校验值不匹配。');
    }

    const now = new Date();
    const document: KnowledgeDocument = {
      chunkCount: 0,
      createdAt: now,
      fileName: session.fileName,
      id: documentId,
      mimeType: session.mimeType,
      moduleId: session.moduleId,
      sha256: stored.sha256,
      sizeBytes: stored.sizeBytes,
      status: 'queued',
      storageKey,
      updatedAt: now,
    };

    await this.repository.completeUpload(
      { ...session, status: 'completed' },
      document,
      {
        attempts: 0,
        createdAt: now,
        documentId,
        id: randomUUID(),
        maxAttempts: this.maxAttempts,
        nextRunAt: now,
        progress: 0,
        status: 'queued',
        updatedAt: now,
      },
    );
    await this.storage.deleteMany(orderedParts.map((part) => part.storageKey));

    return document;
  }
}
