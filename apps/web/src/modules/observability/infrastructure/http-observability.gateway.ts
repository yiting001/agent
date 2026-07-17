import type { HttpClient } from '@/shared/http/http-client';

import { ObservabilityGateway } from '../application/observability.gateway';
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
import type { ObservabilityTracePageQuery } from '../application/observability.gateway';

export class HttpObservabilityGateway extends ObservabilityGateway {
  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  convertFeedbackReview(
    feedbackId: string,
    input: ConvertFeedbackReviewInput,
  ): Promise<FeedbackReviewConversionResult> {
    return this.httpClient.post<
      FeedbackReviewConversionResult,
      ConvertFeedbackReviewInput
    >(
      `/observability/feedback-reviews/${encodeURIComponent(feedbackId)}/evaluation-case`,
      input,
    );
  }

  decideFeedbackReview(
    feedbackId: string,
    input: DecideFeedbackReviewInput,
  ): Promise<FeedbackReviewItem> {
    return this.httpClient.put<FeedbackReviewItem, DecideFeedbackReviewInput>(
      `/observability/feedback-reviews/${encodeURIComponent(feedbackId)}`,
      input,
    );
  }

  getDashboard(hours: number): Promise<ObservabilityDashboard> {
    return this.httpClient.get<ObservabilityDashboard>(
      `/observability/dashboard?hours=${hours}`,
    );
  }

  getTrace(traceId: string): Promise<ObservabilityTraceDetail> {
    return this.httpClient.get<ObservabilityTraceDetail>(
      `/observability/traces/${encodeURIComponent(traceId)}`,
    );
  }

  listTraces(
    query: ObservabilityTracePageQuery,
  ): Promise<ObservabilityTracePage> {
    const params = new URLSearchParams({
      hours: String(query.hours),
      page: String(query.page),
      pageSize: String(query.pageSize),
    });

    if (query.cursor) {
      params.set('cursorStartedAt', query.cursor.startedAt);
      params.set('cursorTraceId', query.cursor.traceId);
    }

    return this.httpClient.get<ObservabilityTracePage>(
      `/observability/traces?${params.toString()}`,
    );
  }

  listFeedbackReviews(
    status: FeedbackReviewQueueStatus,
    page: number,
    pageSize: number,
  ): Promise<FeedbackReviewPage> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      status,
    });

    return this.httpClient.get<FeedbackReviewPage>(
      `/observability/feedback-reviews?${params.toString()}`,
    );
  }
}
