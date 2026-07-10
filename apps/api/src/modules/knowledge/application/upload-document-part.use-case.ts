import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import { KnowledgeObjectStorage } from './knowledge-object-storage';
import { KnowledgeUploadRepository } from './knowledge-upload.repository';

export interface UploadDocumentPartCommand {
  contentLength: number;
  expectedSha256?: string;
  partNumber: number;
  source: AsyncIterable<Uint8Array>;
  uploadSessionId: string;
}

export interface UploadedPartResult {
  partNumber: number;
  receivedBytes: number;
  sha256: string;
  sizeBytes: number;
}

@Injectable()
export class UploadDocumentPartUseCase {
  constructor(
    private readonly repository: KnowledgeUploadRepository,
    private readonly storage: KnowledgeObjectStorage,
  ) {}

  async execute(
    command: UploadDocumentPartCommand,
  ): Promise<UploadedPartResult> {
    const session = await this.repository.findSession(command.uploadSessionId);

    if (!session || session.status !== 'open') {
      throw new ApplicationError('not_found', '上传会话不存在或已经完成。');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new ApplicationError('invalid_operation', '上传会话已经过期。');
    }

    const expectedSize =
      command.partNumber === session.expectedParts
        ? session.totalBytes -
          session.chunkSizeBytes * (session.expectedParts - 1)
        : session.chunkSizeBytes;

    if (
      command.partNumber < 1 ||
      command.partNumber > session.expectedParts ||
      command.contentLength !== expectedSize
    ) {
      throw new ApplicationError(
        'invalid_operation',
        '分片序号或 Content-Length 与上传会话不匹配。',
      );
    }

    const existing = await this.repository.findPart(
      session.id,
      command.partNumber,
    );

    if (existing) {
      return {
        partNumber: existing.partNumber,
        receivedBytes: session.receivedBytes,
        sha256: existing.sha256,
        sizeBytes: existing.sizeBytes,
      };
    }

    const storageKey = `uploads/${session.id}/parts/${command.partNumber}`;
    const stored = await this.storage.write(storageKey, command.source);

    if (stored.sizeBytes !== command.contentLength) {
      await this.storage.deleteMany([storageKey]);
      throw new ApplicationError('invalid_operation', '分片实际大小不正确。');
    }

    if (
      command.expectedSha256 &&
      stored.sha256 !== command.expectedSha256.toLowerCase()
    ) {
      await this.storage.deleteMany([storageKey]);
      throw new ApplicationError('invalid_operation', '分片校验值不匹配。');
    }

    const receivedBytes = session.receivedBytes + stored.sizeBytes;

    await this.repository.savePart(
      {
        id: randomUUID(),
        partNumber: command.partNumber,
        sha256: stored.sha256,
        sizeBytes: stored.sizeBytes,
        storageKey,
        uploadSessionId: session.id,
      },
      receivedBytes,
    );

    return {
      partNumber: command.partNumber,
      receivedBytes,
      sha256: stored.sha256,
      sizeBytes: stored.sizeBytes,
    };
  }
}
