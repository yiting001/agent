import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { UploadChatAttachmentUseCase } from '../../application/upload-chat-attachment.use-case';
import type { ChatAttachmentSummary } from '../../domain/chat';

function decodeFileName(value: string | undefined): string {
  if (!value) {
    return '未命名附件';
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

@Controller('chat-attachments')
export class UploadChatAttachmentController {
  constructor(private readonly useCase: UploadChatAttachmentUseCase) {}

  @Post()
  execute(
    @Headers('content-type') contentType: string,
    @Headers('content-length') contentLength: string,
    @Headers('x-file-name') fileName: string | undefined,
    @Req() request: Request,
  ): Promise<ChatAttachmentSummary> {
    return this.useCase.execute({
      contentLength: Number(contentLength),
      fileName: decodeFileName(fileName),
      mimeType: contentType.split(';')[0]?.trim().toLowerCase() ?? '',
      source: request,
    });
  }
}
