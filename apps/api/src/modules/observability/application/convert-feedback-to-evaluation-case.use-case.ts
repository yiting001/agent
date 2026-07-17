import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { FeedbackEvaluationConversionResult } from '../domain/feedback-review';
import {
  EVALUATION_CASE_CRITERIA_MAX_CHARACTERS,
  EVALUATION_CASE_EXPECTED_OUTPUT_MAX_CHARACTERS,
  EVALUATION_CASE_INPUT_MAX_CHARACTERS,
  EVALUATION_CASE_KEYWORD_MAX_CHARACTERS,
  EVALUATION_CASE_TAG_MAX_CHARACTERS,
} from '../domain/feedback-review';
import { sanitizeGenerationText } from '../domain/observability-generation';
import { FeedbackReviewRepository } from './feedback-review.repository';

export interface ConvertFeedbackToEvaluationCaseCommand {
  evaluationCriteria?: string;
  expectedKeywords: string[];
  expectedOutput?: string;
  feedbackId: string;
  input: string;
  subject: string;
  suiteId: string;
  tags: string[];
}

@Injectable()
export class ConvertFeedbackToEvaluationCaseUseCase {
  constructor(private readonly repository: FeedbackReviewRepository) {}

  execute(
    command: ConvertFeedbackToEvaluationCaseCommand,
  ): Promise<FeedbackEvaluationConversionResult> {
    const input = sanitizeGenerationText(
      command.input.trim(),
      EVALUATION_CASE_INPUT_MAX_CHARACTERS,
    ).value;
    const expectedKeywords = normalizeValues(
      command.expectedKeywords,
      EVALUATION_CASE_KEYWORD_MAX_CHARACTERS,
    );

    if (!input || expectedKeywords.length === 0) {
      throw new ApplicationError(
        'invalid_operation',
        'Evaluation case 必须包含输入和至少一个期望关键词。',
      );
    }

    return this.repository.convertToEvaluationCase({
      ...command,
      evaluationCriteria: sanitizeOptional(
        command.evaluationCriteria,
        EVALUATION_CASE_CRITERIA_MAX_CHARACTERS,
      ),
      expectedKeywords,
      expectedOutput: sanitizeOptional(
        command.expectedOutput,
        EVALUATION_CASE_EXPECTED_OUTPUT_MAX_CHARACTERS,
      ),
      input,
      tags: normalizeValues(command.tags, EVALUATION_CASE_TAG_MAX_CHARACTERS),
    });
  }
}

function normalizeValues(values: string[], maxCharacters: number): string[] {
  return [
    ...new Set(
      values
        .map(
          (value) => sanitizeGenerationText(value.trim(), maxCharacters).value,
        )
        .filter(Boolean),
    ),
  ];
}

function sanitizeOptional(
  value: string | undefined,
  maxCharacters: number,
): string | undefined {
  const normalized = value?.trim();

  return normalized
    ? sanitizeGenerationText(normalized, maxCharacters).value
    : undefined;
}
