export type FeedbackReviewStatus =
  | 'accepted'
  | 'converted'
  | 'pending'
  | 'rejected';

export type FeedbackReviewQueueStatus = Extract<
  FeedbackReviewStatus,
  'accepted' | 'pending'
>;

export type FeedbackReasonCode =
  | 'citation'
  | 'format'
  | 'incorrect'
  | 'irrelevant'
  | 'model'
  | 'other';

export interface FeedbackReviewItem {
  agentId: string;
  comment?: string;
  createdAt: string;
  expectedOutput: string;
  feedbackId: string;
  generationId: string;
  input: string;
  rating: 'negative' | 'positive';
  reasonCodes: FeedbackReasonCode[];
  reviewedAt?: string;
  reviewerSubject?: string;
  reviewReason?: string;
  reviewStatus: FeedbackReviewStatus;
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

export interface DecideFeedbackReviewInput {
  decision: 'accepted' | 'rejected';
  expectedUpdatedAt: string;
  reason: string;
}

export interface ConvertFeedbackReviewInput {
  evaluationCriteria: string;
  expectedKeywords: string[];
  expectedOutput: string;
  input: string;
  suiteId: string;
  tags: string[];
}

export interface FeedbackReviewConversionResult {
  alreadyConverted: boolean;
  evaluationCaseId: string;
  feedbackId: string;
  reviewStatus: 'converted';
}
