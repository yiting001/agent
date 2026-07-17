import type {
  FeedbackEvaluationConversionResult,
  FeedbackReviewItem,
  FeedbackReviewPage,
} from '../domain/feedback-review';
import type { ObservabilityFeedbackReviewStatus } from '../domain/observability-generation';

export interface ListFeedbackReviewsInput {
  page: number;
  pageSize: number;
  status: ObservabilityFeedbackReviewStatus;
  subject: string;
}

export interface DecideFeedbackReviewInput {
  decision: 'accepted' | 'rejected';
  expectedUpdatedAt: string;
  feedbackId: string;
  reason: string;
  subject: string;
}

export interface ConvertFeedbackToEvaluationCaseInput {
  evaluationCriteria?: string;
  expectedKeywords: string[];
  expectedOutput?: string;
  feedbackId: string;
  input: string;
  subject: string;
  suiteId: string;
  tags: string[];
}

export abstract class FeedbackReviewRepository {
  abstract convertToEvaluationCase(
    input: ConvertFeedbackToEvaluationCaseInput,
  ): Promise<FeedbackEvaluationConversionResult>;

  abstract decide(
    input: DecideFeedbackReviewInput,
  ): Promise<FeedbackReviewItem>;

  abstract list(input: ListFeedbackReviewsInput): Promise<FeedbackReviewPage>;
}
