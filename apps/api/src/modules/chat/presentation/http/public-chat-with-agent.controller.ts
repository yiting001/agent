import { Body, Controller, HttpCode, Param, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { ChatWithAgentUseCase } from '../../application/chat-with-agent.use-case';
import { sendAgentChatStream } from './chat-stream.response';
import { ChatWithAgentDto } from './chat-with-agent.dto';

@ApiTags('public-chat')
@Controller('public/agents/:agentId/chat')
export class PublicChatWithAgentController {
  constructor(private readonly chatWithAgent: ChatWithAgentUseCase) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '调用已发布智能体进行公开网页对话' })
  async execute(
    @Param('agentId') agentId: string,
    @Body() body: ChatWithAgentDto,
    @Res() response: Response,
  ): Promise<void> {
    const command = {
      agentId,
      conversationId: body.conversationId,
      memoryOwnerKey: body.memoryOwnerKey,
      messages: body.messages,
      access: 'public' as const,
    };

    if (body.stream === false) {
      response.json(await this.chatWithAgent.execute(command));
      return;
    }

    await sendAgentChatStream(
      response,
      await this.chatWithAgent.executeStream(command),
    );
  }
}
