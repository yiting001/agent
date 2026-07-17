import type {
  DecideFeedbackReviewInput,
  FeedbackReviewPage,
} from '../domain/feedback-review';
import type { ObservabilityTracePage } from '../domain/observability-dashboard';
import { HttpError } from '@/shared/http/http-client';

export const FEEDBACK_REVIEW_PAGE_SIZE = 20;
export const TRACE_PAGE_SIZE = 10;

export interface FailedDecision {
  feedbackId: string;
  input: DecideFeedbackReviewInput;
}

export function createManagementRequestError(
  invalidate: () => void,
): (
  error: unknown,
  forbiddenMessage: string,
  fallbackMessage: string,
) => string {
  return (error, forbiddenMessage, fallbackMessage): string => {
    if (error instanceof HttpError && error.status === 401) {
      invalidate();
      return '管理凭证无效或已失效，请重新登录。';
    }

    if (error instanceof HttpError && error.status === 403) {
      return forbiddenMessage;
    }

    return error instanceof Error ? error.message : fallbackMessage;
  };
}

export function emptyFeedbackReviewPage(): FeedbackReviewPage {
  return {
    items: [],
    page: 1,
    pageSize: FEEDBACK_REVIEW_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };
}

export function emptyTracePage(): ObservabilityTracePage {
  return {
    items: [],
    page: 1,
    pageSize: TRACE_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };
}
