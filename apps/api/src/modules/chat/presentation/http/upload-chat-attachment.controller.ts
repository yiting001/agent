import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ApplicationError } from '../../../../shared/application/application-error';
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

function readOwner(
  agentId: string | undefined,
  ownerKey: string | undefined,
): { agentId: string; ownerKey: string } | undefined {
  if (!agentId && !ownerKey) {
    return undefined;
  }

  if (!agentId || !ownerKey || agentId.length > 80 || ownerKey.length > 80) {
    throw new ApplicationError(
      'invalid_operation',
      '绑定附件时必须提供有效的智能体和记忆 owner。',
    );
  }

  return { agentId, ownerKey };
}

@Controller('chat-attachments')
export class UploadChatAttachmentController {
  constructor(private readonly useCase: UploadChatAttachmentUseCase) {}

  @Post()
  execute(
    @Headers('content-type') contentType: string,
    @Headers('content-length') contentLength: string,
    @Headers('x-file-name') fileName: string | undefined,
    @Headers('x-agent-id') agentId: string | undefined,
    @Headers('x-memory-owner-key') ownerKey: string | undefined,
    @Req() request: Request,
  ): Promise<ChatAttachmentSummary> {
    return this.useCase.execute({
      contentLength: Number(contentLength),
      fileName: decodeFileName(fileName),
      mimeType: contentType.split(';')[0]?.trim().toLowerCase() ?? '',
      owner: readOwner(agentId?.trim(), ownerKey?.trim()),
      source: request,
    });
  }
}
