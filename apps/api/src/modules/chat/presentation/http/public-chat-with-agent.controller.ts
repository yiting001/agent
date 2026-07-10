import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ChatWithAgentUseCase } from '../../application/chat-with-agent.use-case';
import type { AgentChatResponse } from '../../domain/chat';
import { ChatWithAgentDto } from './chat-with-agent.dto';

@ApiTags('public-chat')
@Controller('public/agents/:agentId/chat')
export class PublicChatWithAgentController {
  constructor(private readonly chatWithAgent: ChatWithAgentUseCase) {}

  @Post()
  @ApiOperation({ summary: '调用已发布智能体进行公开网页对话' })
  execute(
    @Param('agentId') agentId: string,
    @Body() body: ChatWithAgentDto,
  ): Promise<AgentChatResponse> {
    return this.chatWithAgent.execute({
      agentId,
      messages: body.messages,
      requirePublished: true,
    });
  }
}
