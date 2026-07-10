import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { UploadSessionSummary } from '../domain/knowledge-upload';
import { KnowledgeUploadRepository } from './knowledge-upload.repository';

@Injectable()
export class GetUploadSessionUseCase {
  constructor(private readonly repository: KnowledgeUploadRepository) {}

  async execute(id: string): Promise<UploadSessionSummary> {
    const [session, parts] = await Promise.all([
      this.repository.findSession(id),
      this.repository.listParts(id),
    ]);

    if (!session) {
      throw new ApplicationError('not_found', '上传会话不存在。');
    }

    return {
      chunkSizeBytes: session.chunkSizeBytes,
      expectedParts: session.expectedParts,
      expiresAt: session.expiresAt.toISOString(),
      fileName: session.fileName,
      id: session.id,
      mimeType: session.mimeType,
      receivedBytes: session.receivedBytes,
      status: session.status,
      totalBytes: session.totalBytes,
      uploadedParts: parts
        .map((part) => part.partNumber)
        .sort((left, right) => left - right),
    };
  }
}
