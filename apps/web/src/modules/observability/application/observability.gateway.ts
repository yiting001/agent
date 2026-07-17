import type {
  ObservabilityDashboard,
  ObservabilityTraceDetail,
  ObservabilityTracePage,
} from '../domain/observability-dashboard';
import type {
  ConvertFeedbackReviewInput,
  DecideFeedbackReviewInput,
  FeedbackReviewConversionResult,
  FeedbackReviewItem,
  FeedbackReviewPage,
  FeedbackReviewQueueStatus,
} from '../domain/feedback-review';

export interface ObservabilityTracePageQuery {
  cursor?: {
    startedAt: string;
    traceId: string;
  };
  hours: number;
  page: number;
  pageSize: number;
}

/** 获取观测仪表盘聚合数据的应用层端口。 */
export abstract class ObservabilityGateway {
  abstract convertFeedbackReview(
    feedbackId: string,
    input: ConvertFeedbackReviewInput,
  ): Promise<FeedbackReviewConversionResult>;
  abstract decideFeedbackReview(
    feedbackId: string,
    input: DecideFeedbackReviewInput,
  ): Promise<FeedbackReviewItem>;
  abstract getDashboard(hours: number): Promise<ObservabilityDashboard>;
  abstract getTrace(traceId: string): Promise<ObservabilityTraceDetail>;
  abstract listTraces(
    query: ObservabilityTracePageQuery,
  ): Promise<ObservabilityTracePage>;
  abstract listFeedbackReviews(
    status: FeedbackReviewQueueStatus,
    page: number,
    pageSize: number,
  ): Promise<FeedbackReviewPage>;
}
