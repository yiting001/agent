import { Body, Controller, HttpCode, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import { ChatWithAgentUseCase } from '../../application/chat-with-agent.use-case';
import { sendAgentChatStream } from './chat-stream.response';
import { ChatWithAgentDto } from './chat-with-agent.dto';

@Controller('agents')
export class ChatWithAgentController {
  constructor(private readonly useCase: ChatWithAgentUseCase) {}

  @Post(':id/chat')
  @HttpCode(200)
  async execute(
    @Param('id') agentId: string,
    @Body() body: ChatWithAgentDto,
    @Res() response: Response,
  ): Promise<void> {
    const command = {
      agentId,
      messages: body.messages,
      access: 'admin' as const,
    };

    if (body.stream === false) {
      response.json(await this.useCase.execute(command));
      return;
    }

    await sendAgentChatStream(
      response,
      await this.useCase.executeStream(command),
    );
  }
}
