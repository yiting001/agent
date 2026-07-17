import { IsIn, IsISO8601, IsString, Length } from 'class-validator';

import { FEEDBACK_REVIEW_REASON_MAX_CHARACTERS } from '../../domain/feedback-review';

export class DecideFeedbackReviewDto {
  @IsIn(['accepted', 'rejected'])
  decision: 'accepted' | 'rejected';

  @IsISO8601({ strict: true })
  expectedUpdatedAt: string;

  @IsString()
  @Length(1, FEEDBACK_REVIEW_REASON_MAX_CHARACTERS)
  reason: string;
}
