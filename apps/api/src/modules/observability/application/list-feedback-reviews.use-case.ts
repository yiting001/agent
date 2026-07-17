import { Injectable } from '@nestjs/common';

import type { FeedbackReviewPage } from '../domain/feedback-review';
import type { ObservabilityFeedbackReviewStatus } from '../domain/observability-generation';
import { FeedbackReviewRepository } from './feedback-review.repository';

export interface ListFeedbackReviewsQuery {
  page: number;
  pageSize: number;
  status: ObservabilityFeedbackReviewStatus;
  subject: string;
}

@Injectable()
export class ListFeedbackReviewsUseCase {
  constructor(private readonly repository: FeedbackReviewRepository) {}

  execute(query: ListFeedbackReviewsQuery): Promise<FeedbackReviewPage> {
    return this.repository.list(query);
  }
}
