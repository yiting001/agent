import { Body, Controller, Headers, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../../shared/application/application-error';
import { ApiApplicationRepository } from '../../../api-access/application/api-application.repository';
import { ApiKeyAuthenticatorService } from '../../../api-access/application/api-key-authenticator.service';
import { EnforceApiRateLimitService } from '../../../api-access/application/enforce-api-rate-limit.service';
import { ChatWithAgentUseCase } from '../../application/chat-with-agent.use-case';
import { sendOpenAiChatStream } from './chat-stream.response';
import { OpenAiChatCompletionDto } from './openai-chat-completion.dto';

interface OpenAiChatCompletionResponse {
  choices: Array<{
    finish_reason: 'stop';
    index: number;
    message: {
      content: string;
      role: 'assistant';
    };
  }>;
  created: number;
  id: string;
  model: string;
  object: 'chat.completion';
}

function readBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) {
    throw new ApplicationError('unauthorized', '缺少 Bearer API 密钥。');
  }

  return authorization.slice('Bearer '.length).trim();
}

@Controller('v1/chat')
export class OpenAiChatCompletionController {
  constructor(
    private readonly useCase: ChatWithAgentUseCase,
    private readonly authenticator: ApiKeyAuthenticatorService,
    private readonly applications: ApiApplicationRepository,
    private readonly rateLimit: EnforceApiRateLimitService,
  ) {}

  @Post('completions')
  @HttpCode(200)
  async execute(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: OpenAiChatCompletionDto,
    @Res() response: Response,
  ): Promise<void> {
    const application = await this.authenticator.authenticate(
      readBearerToken(authorization),
    );

    await this.rateLimit.execute({
      identifier: application.id,
      kind: 'application',
    });
    const command = {
      agentId: application.agentId,
      conversationId: body.conversationId,
      memoryOwnerKey: application.id,
      messages: body.messages,
      access: 'api' as const,
    };
    const completionId = `chatcmpl_${randomUUID()}`;
    const model = body.model ?? application.agentId;

    if (body.stream !== false) {
      const completed = await sendOpenAiChatStream(
        response,
        await this.useCase.executeStream(command),
        completionId,
        model,
      );

      if (completed) {
        await this.applications.incrementRequestCount(application.id);
      }

      return;
    }

    const chat = await this.useCase.execute(command);

    await this.applications.incrementRequestCount(application.id);
    response.json({
      choices: [
        {
          finish_reason: 'stop',
          index: 0,
          message: {
            content: chat.answer,
            role: 'assistant',
          },
        },
      ],
      created: Math.floor(Date.now() / 1_000),
      id: completionId,
      model,
      object: 'chat.completion',
    } satisfies OpenAiChatCompletionResponse);
  }
}
