import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { EnforceApiRateLimitService } from '../../../api-access/application/enforce-api-rate-limit.service';
import { ChatWithAgentUseCase } from '../../application/chat-with-agent.use-case';
import { sendAgentChatStream } from './chat-stream.response';
import { ChatWithAgentDto } from './chat-with-agent.dto';

/** 无 API 密钥的公开聊天入口，仅拒绝 disabled 智能体。 */
@ApiTags('public-chat')
@Controller('public/agents/:agentId/chat')
export class PublicChatWithAgentController {
  constructor(
    private readonly chatWithAgent: ChatWithAgentUseCase,
    private readonly rateLimit: EnforceApiRateLimitService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '调用已发布智能体进行公开网页对话' })
  /** 使用 agentId + 代理解析后的客户端 IP 作为公开限流身份。 */
  async execute(
    @Param('agentId') agentId: string,
    @Body() body: ChatWithAgentDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.rateLimit.execute({
      identifier: `${agentId}:${request.ip}`,
      kind: 'public_chat',
    });

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
