import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import type {
  ObservabilityFeedbackRating,
  ObservabilityFeedbackReason,
} from '../../domain/observability-generation';

const FEEDBACK_RATINGS: ObservabilityFeedbackRating[] = [
  'negative',
  'positive',
];
const FEEDBACK_REASONS: ObservabilityFeedbackReason[] = [
  'citation',
  'format',
  'incorrect',
  'irrelevant',
  'model',
  'other',
];

export class SubmitGenerationFeedbackDto {
  @IsString()
  @MinLength(10)
  memoryOwnerToken: string;

  @IsIn(FEEDBACK_RATINGS)
  rating: ObservabilityFeedbackRating;

  @IsArray()
  @ArrayMaxSize(FEEDBACK_REASONS.length)
  @ArrayUnique()
  @IsIn(FEEDBACK_REASONS, { each: true })
  reasonCodes: ObservabilityFeedbackReason[];

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  comment?: string;
}
