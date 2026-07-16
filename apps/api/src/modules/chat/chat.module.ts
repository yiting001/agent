import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { AgentMemoryModule } from '../agent-memory/agent-memory.module';
import { MemoryOwnerIdentityModule } from '../agent-memory/memory-owner-identity.module';
import { ApiAccessModule } from '../api-access/api-access.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ModelProvidersModule } from '../model-providers/model-providers.module';
import { PromptPoliciesModule } from '../prompt-policies/prompt-policies.module';
import { SkillsModule } from '../skills/skills.module';
import { ChatWithAgentUseCase } from './application/chat-with-agent.use-case';
import { ChatConversationTracker } from './application/chat-conversation-tracker.service';
import { SkillToolLoopService } from './application/skill-tool-loop.service';
import { ChatAttachmentModule } from './chat-attachment.module';
import { ChatWithAgentController } from './presentation/http/chat-with-agent.controller';
import { OpenAiChatCompletionController } from './presentation/http/openai-chat-completion.controller';
import { PublicChatWithAgentController } from './presentation/http/public-chat-with-agent.controller';

@Module({
  controllers: [
    ChatWithAgentController,
    OpenAiChatCompletionController,
    PublicChatWithAgentController,
  ],
  exports: [ChatWithAgentUseCase],
  imports: [
    AgentsModule,
    AgentMemoryModule,
    MemoryOwnerIdentityModule,
    ApiAccessModule,
    ChatAttachmentModule,
    KnowledgeModule,
    ModelProvidersModule,
    PromptPoliciesModule,
    SkillsModule,
  ],
  providers: [
    ChatConversationTracker,
    ChatWithAgentUseCase,
    SkillToolLoopService,
  ],
})
export class ChatModule {}
