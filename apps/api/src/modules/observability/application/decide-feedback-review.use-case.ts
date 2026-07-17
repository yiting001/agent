import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { FeedbackReviewItem } from '../domain/feedback-review';
import { sanitizeGenerationText } from '../domain/observability-generation';
import { FEEDBACK_REVIEW_REASON_MAX_CHARACTERS } from '../domain/feedback-review';
import { FeedbackReviewRepository } from './feedback-review.repository';

export interface DecideFeedbackReviewCommand {
  decision: 'accepted' | 'rejected';
  expectedUpdatedAt: string;
  feedbackId: string;
  reason: string;
  subject: string;
}

@Injectable()
export class DecideFeedbackReviewUseCase {
  constructor(private readonly repository: FeedbackReviewRepository) {}

  execute(command: DecideFeedbackReviewCommand): Promise<FeedbackReviewItem> {
    const reason = sanitizeGenerationText(
      command.reason.trim(),
      FEEDBACK_REVIEW_REASON_MAX_CHARACTERS,
    ).value;

    if (!reason) {
      throw new ApplicationError('invalid_operation', '审核原因不能为空。');
    }

    return this.repository.decide({ ...command, reason });
  }
}
