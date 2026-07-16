import { Injectable } from '@nestjs/common';
import { randomUUID, timingSafeEqual } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import type {
  ObservabilityFeedbackRating,
  ObservabilityFeedbackReason,
  ObservabilityFeedbackView,
} from '../domain/observability-generation';
import { sanitizeGenerationText } from '../domain/observability-generation';
import { GenerationCaptureService } from './generation-capture.service';
import { ObservabilityGenerationRepository } from './observability-generation.repository';

const MAX_FEEDBACK_COMMENT_CHARACTERS = 1_000;

export interface SubmitGenerationFeedbackCommand {
  actorKey: string;
  agentId: string;
  comment?: string;
  generationId: string;
  rating: ObservabilityFeedbackRating;
  reasonCodes: ObservabilityFeedbackReason[];
}

@Injectable()
export class SubmitGenerationFeedbackUseCase {
  constructor(
    private readonly repository: ObservabilityGenerationRepository,
    private readonly capture: GenerationCaptureService,
  ) {}

  async execute(
    command: SubmitGenerationFeedbackCommand,
  ): Promise<ObservabilityFeedbackView> {
    const generation = await this.repository.findById(command.generationId);

    if (!generation || generation.agentId !== command.agentId) {
      throw new ApplicationError('not_found', '待评价的模型回答不存在。');
    }

    const actorKeyHash = this.capture.hashActorKey(command.actorKey);

    if (
      !generation.actorKeyHash ||
      !this.matchesActor(generation.actorKeyHash, actorKeyHash)
    ) {
      throw new ApplicationError('unauthorized', '无权评价其他会话的回答。');
    }

    const now = new Date();
    const comment = command.comment?.trim()
      ? sanitizeGenerationText(
          command.comment.trim(),
          MAX_FEEDBACK_COMMENT_CHARACTERS,
        ).value
      : undefined;
    const feedback = await this.repository.upsertFeedback({
      actorKeyHash,
      comment,
      createdAt: now,
      generationId: generation.id,
      id: randomUUID(),
      metric: 'helpfulness',
      rating: command.rating,
      reasonCodes: [...new Set(command.reasonCodes)],
      source: 'end_user',
      updatedAt: now,
    });

    return {
      comment: feedback.comment,
      createdAt: feedback.createdAt.toISOString(),
      id: feedback.id,
      metric: feedback.metric,
      rating: feedback.rating,
      reasonCodes: feedback.reasonCodes,
      source: feedback.source,
      updatedAt: feedback.updatedAt.toISOString(),
    };
  }

  private matchesActor(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);

    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }
}
