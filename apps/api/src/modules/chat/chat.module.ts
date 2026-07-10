import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { ApiAccessModule } from '../api-access/api-access.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ModelProvidersModule } from '../model-providers/model-providers.module';
import { ChatWithAgentUseCase } from './application/chat-with-agent.use-case';
import { ChatWithAgentController } from './presentation/http/chat-with-agent.controller';
import { OpenAiChatCompletionController } from './presentation/http/openai-chat-completion.controller';
import { PublicChatWithAgentController } from './presentation/http/public-chat-with-agent.controller';

@Module({
  controllers: [
    ChatWithAgentController,
    OpenAiChatCompletionController,
    PublicChatWithAgentController,
  ],
  imports: [
    AgentsModule,
    ApiAccessModule,
    KnowledgeModule,
    ModelProvidersModule,
  ],
  providers: [ChatWithAgentUseCase],
})
export class ChatModule {}
