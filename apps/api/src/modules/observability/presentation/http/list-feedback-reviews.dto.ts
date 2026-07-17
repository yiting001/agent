import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import type { ObservabilityFeedbackReviewStatus } from '../../domain/observability-generation';

const REVIEW_STATUSES: ObservabilityFeedbackReviewStatus[] = [
  'accepted',
  'converted',
  'pending',
  'rejected',
];

export class ListFeedbackReviewsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @IsIn(REVIEW_STATUSES)
  @IsOptional()
  status?: ObservabilityFeedbackReviewStatus;
}
