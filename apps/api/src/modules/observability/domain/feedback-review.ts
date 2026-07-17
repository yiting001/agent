import type {
  ObservabilityFeedbackRating,
  ObservabilityFeedbackReason,
  ObservabilityFeedbackReviewStatus,
} from './observability-generation';

export const EVALUATION_CASE_CRITERIA_MAX_CHARACTERS = 4_000;
export const EVALUATION_CASE_EXPECTED_OUTPUT_MAX_CHARACTERS = 20_000;
export const EVALUATION_CASE_INPUT_MAX_CHARACTERS = 4_000;
export const EVALUATION_CASE_KEYWORD_MAX_CHARACTERS = 80;
export const EVALUATION_CASE_MAX_KEYWORDS = 20;
export const EVALUATION_CASE_MAX_TAGS = 20;
export const EVALUATION_CASE_TAG_MAX_CHARACTERS = 40;
export const FEEDBACK_REVIEW_REASON_MAX_CHARACTERS = 1_000;

export interface FeedbackReviewItem {
  agentId: string;
  comment?: string;
  createdAt: string;
  expectedOutput: string;
  feedbackId: string;
  generationId: string;
  input: string;
  rating: ObservabilityFeedbackRating;
  reasonCodes: ObservabilityFeedbackReason[];
  reviewReason?: string;
  reviewedAt?: string;
  reviewerSubject?: string;
  reviewStatus: ObservabilityFeedbackReviewStatus;
  truncated: boolean;
  updatedAt: string;
}

export interface FeedbackReviewPage {
  items: FeedbackReviewItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FeedbackEvaluationConversionResult {
  alreadyConverted: boolean;
  evaluationCaseId: string;
  feedbackId: string;
  reviewStatus: 'converted';
}
