import { Body, Controller, Param, Put, Req } from '@nestjs/common';
import type { Request } from 'express';

import { MemoryOwnerIdentity } from '../../../agent-memory/application/memory-owner-identity';
import { EnforceApiRateLimitService } from '../../../api-access/application/enforce-api-rate-limit.service';
import { SubmitGenerationFeedbackUseCase } from '../../application/submit-generation-feedback.use-case';
import type { ObservabilityFeedbackView } from '../../domain/observability-generation';
import { SubmitGenerationFeedbackDto } from './submit-generation-feedback.dto';

@Controller('agents/:agentId/generations')
export class SubmitGenerationFeedbackController {
  constructor(
    private readonly useCase: SubmitGenerationFeedbackUseCase,
    private readonly ownerIdentity: MemoryOwnerIdentity,
    private readonly rateLimit: EnforceApiRateLimitService,
  ) {}

  @Put(':generationId/feedback')
  async execute(
    @Param('agentId') agentId: string,
    @Param('generationId') generationId: string,
    @Body() body: SubmitGenerationFeedbackDto,
    @Req() request: Request,
  ): Promise<ObservabilityFeedbackView> {
    const actorKey = this.ownerIdentity.resolve(body.memoryOwnerToken);

    await this.rateLimit.execute({
      identifier: `feedback:${agentId}:${request.ip}:${actorKey}`,
      kind: 'public_chat',
    });

    return this.useCase.execute({
      actorKey,
      agentId,
      comment: body.comment,
      generationId,
      rating: body.rating,
      reasonCodes: body.reasonCodes,
    });
  }
}
