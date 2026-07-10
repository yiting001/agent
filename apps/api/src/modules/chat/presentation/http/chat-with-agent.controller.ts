import { Body, Controller, Param, Post } from '@nestjs/common';

import type { AgentChatResponse } from '../../domain/chat';
import { ChatWithAgentUseCase } from '../../application/chat-with-agent.use-case';
import { ChatWithAgentDto } from './chat-with-agent.dto';

@Controller('agents')
export class ChatWithAgentController {
  constructor(private readonly useCase: ChatWithAgentUseCase) {}

  @Post(':id/chat')
  execute(
    @Param('id') agentId: string,
    @Body() body: ChatWithAgentDto,
  ): Promise<AgentChatResponse> {
    return this.useCase.execute({
      agentId,
      messages: body.messages,
      requirePublished: false,
    });
  }
}
