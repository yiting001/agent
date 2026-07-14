import { Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { MemoryOwnerIdentity } from '../../../agent-memory/application/memory-owner-identity';
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
  ownerToken: string | undefined,
  identity: MemoryOwnerIdentity,
): { agentId: string; ownerKey: string } | undefined {
  if (!agentId && !ownerToken) {
    return undefined;
  }

  if (
    !agentId ||
    !ownerToken ||
    agentId.length > 80 ||
    ownerToken.length > 160
  ) {
    throw new ApplicationError(
      'invalid_operation',
      '绑定附件时必须提供有效的智能体和记忆 owner。',
    );
  }

  return { agentId, ownerKey: identity.resolve(ownerToken) };
}

@ApiTags('chat-attachments')
@Controller('chat-attachments')
export class UploadChatAttachmentController {
  constructor(
    private readonly useCase: UploadChatAttachmentUseCase,
    private readonly ownerIdentity: MemoryOwnerIdentity,
  ) {}

  @Post()
  @ApiHeader({
    description: '绑定长期记忆时使用的智能体 ID，必须与 owner token 同时提供',
    name: 'X-Agent-Id',
    required: false,
  })
  @ApiHeader({
    description: '由 POST /api/memory-owner-tokens 签发的匿名 bearer token',
    name: 'X-Memory-Owner-Token',
    required: false,
  })
  @ApiOperation({ summary: '上传聊天图片或音频附件' })
  execute(
    @Headers('content-type') contentType: string,
    @Headers('content-length') contentLength: string,
    @Headers('x-file-name') fileName: string | undefined,
    @Headers('x-agent-id') agentId: string | undefined,
    @Headers('x-memory-owner-token') ownerToken: string | undefined,
    @Req() request: Request,
  ): Promise<ChatAttachmentSummary> {
    return this.useCase.execute({
      contentLength: Number(contentLength),
      fileName: decodeFileName(fileName),
      mimeType: contentType.split(';')[0]?.trim().toLowerCase() ?? '',
      owner: readOwner(agentId?.trim(), ownerToken?.trim(), this.ownerIdentity),
      source: request,
    });
  }
}
