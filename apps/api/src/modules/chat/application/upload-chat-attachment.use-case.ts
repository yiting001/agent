import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import type { ChatAttachmentSummary } from '../domain/chat';
import {
  ChatAttachmentStorage,
  type ChatAttachmentOwner,
} from './chat-attachment.storage';

const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class UploadChatAttachmentUseCase {
  private readonly maxBytes: number;

  constructor(
    private readonly storage: ChatAttachmentStorage,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.maxBytes = config.chatAttachmentMaxBytes;
  }

  async execute(input: {
    contentLength: number;
    fileName: string;
    mimeType: string;
    owner?: ChatAttachmentOwner;
    source: AsyncIterable<Uint8Array>;
  }): Promise<ChatAttachmentSummary> {
    if (!SUPPORTED_MIME_TYPES.has(input.mimeType)) {
      throw new ApplicationError(
        'invalid_operation',
        '附件仅支持 PNG、JPG、WebP、GIF、MP3 和 WAV。',
      );
    }

    if (
      !Number.isSafeInteger(input.contentLength) ||
      input.contentLength < 1 ||
      input.contentLength > this.maxBytes
    ) {
      throw new ApplicationError(
        'invalid_operation',
        `附件大小必须在 1 字节到 ${this.maxBytes} 字节之间。`,
      );
    }

    const attachment = await this.storage.write(
      input.fileName,
      input.mimeType,
      input.source,
      this.maxBytes,
      input.owner,
    );

    if (attachment.sizeBytes !== input.contentLength) {
      await this.storage.delete(attachment.id);
      throw new ApplicationError(
        'invalid_operation',
        '附件实际大小与 Content-Length 不一致。',
      );
    }

    return attachment;
  }
}
