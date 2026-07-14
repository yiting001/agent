import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { AgentMemoryModule } from '../agent-memory/agent-memory.module';
import { ApiAccessModule } from '../api-access/api-access.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ModelProvidersModule } from '../model-providers/model-providers.module';
import { SkillsModule } from '../skills/skills.module';
import { ChatAttachmentStorage } from './application/chat-attachment.storage';
import { ChatWithAgentUseCase } from './application/chat-with-agent.use-case';
import { SkillToolLoopService } from './application/skill-tool-loop.service';
import { UploadChatAttachmentUseCase } from './application/upload-chat-attachment.use-case';
import { LocalChatAttachmentStorage } from './infrastructure/local-chat-attachment.storage';
import { ChatWithAgentController } from './presentation/http/chat-with-agent.controller';
import { OpenAiChatCompletionController } from './presentation/http/openai-chat-completion.controller';
import { PublicChatWithAgentController } from './presentation/http/public-chat-with-agent.controller';
import { UploadChatAttachmentController } from './presentation/http/upload-chat-attachment.controller';

@Module({
  controllers: [
    ChatWithAgentController,
    OpenAiChatCompletionController,
    PublicChatWithAgentController,
    UploadChatAttachmentController,
  ],
  imports: [
    AgentsModule,
    AgentMemoryModule,
    ApiAccessModule,
    KnowledgeModule,
    ModelProvidersModule,
    SkillsModule,
  ],
  providers: [
    ChatWithAgentUseCase,
    SkillToolLoopService,
    UploadChatAttachmentUseCase,
    {
      provide: ChatAttachmentStorage,
      useClass: LocalChatAttachmentStorage,
    },
  ],
})
export class ChatModule {}
