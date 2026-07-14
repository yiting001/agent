import { Module } from '@nestjs/common';

import { MemoryOwnerIdentityModule } from '../agent-memory/memory-owner-identity.module';
import { ChatAttachmentStorage } from './application/chat-attachment.storage';
import { UploadChatAttachmentUseCase } from './application/upload-chat-attachment.use-case';
import { LocalChatAttachmentStorage } from './infrastructure/local-chat-attachment.storage';
import { UploadChatAttachmentController } from './presentation/http/upload-chat-attachment.controller';

@Module({
  controllers: [UploadChatAttachmentController],
  exports: [ChatAttachmentStorage],
  imports: [MemoryOwnerIdentityModule],
  providers: [
    UploadChatAttachmentUseCase,
    {
      provide: ChatAttachmentStorage,
      useClass: LocalChatAttachmentStorage,
    },
  ],
})
export class ChatAttachmentModule {}
