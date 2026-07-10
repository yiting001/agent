import { Body, Controller, Headers, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../../shared/application/application-error';
import { ApiApplicationRepository } from '../../../api-access/application/api-application.repository';
import { ApiKeyAuthenticatorService } from '../../../api-access/application/api-key-authenticator.service';
import { ChatWithAgentUseCase } from '../../application/chat-with-agent.use-case';
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
  ) {}

  @Post('completions')
  async execute(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: OpenAiChatCompletionDto,
  ): Promise<OpenAiChatCompletionResponse> {
    const application = await this.authenticator.authenticate(
      readBearerToken(authorization),
    );
    const response = await this.useCase.execute({
      agentId: application.agentId,
      messages: body.messages,
      requirePublished: true,
    });

    await this.applications.incrementRequestCount(application.id);

    return {
      choices: [
        {
          finish_reason: 'stop',
          index: 0,
          message: {
            content: response.answer,
            role: 'assistant',
          },
        },
      ],
      created: Math.floor(Date.now() / 1_000),
      id: `chatcmpl_${randomUUID()}`,
      model: body.model ?? application.agentId,
      object: 'chat.completion',
    };
  }
}
