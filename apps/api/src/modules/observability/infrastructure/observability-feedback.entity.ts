import { Check, Column, Entity, Index, PrimaryColumn, Unique } from 'typeorm';

import type {
  ObservabilityFeedbackMetric,
  ObservabilityFeedbackRating,
  ObservabilityFeedbackReason,
  ObservabilityFeedbackReviewStatus,
  ObservabilityFeedbackSource,
} from '../domain/observability-generation';

@Entity('observability_feedback')
@Unique('UQ_observability_feedback_actor_metric', [
  'generationId',
  'actorKeyHash',
  'metric',
])
@Index('IDX_observability_feedback_review_queue', ['reviewStatus', 'updatedAt'])
@Check(
  'CHK_observability_feedback_review_state',
  `COALESCE((
  (
    "reviewStatus" IS NULL AND
    "rating" = 'positive' AND
    "reviewerSubject" IS NULL AND
    "reviewReason" IS NULL AND
    "reviewedAt" IS NULL AND
    "convertedAt" IS NULL
  ) OR (
    "reviewStatus" = 'pending' AND
    "rating" = 'negative' AND
    "reviewerSubject" IS NULL AND
    "reviewReason" IS NULL AND
    "reviewedAt" IS NULL AND
    "convertedAt" IS NULL
  ) OR (
    "reviewStatus" IN ('accepted', 'rejected') AND
    "rating" = 'negative' AND
    "reviewerSubject" IS NOT NULL AND
    "reviewReason" IS NOT NULL AND
    "reviewedAt" IS NOT NULL AND
    "convertedAt" IS NULL
  ) OR (
    "reviewStatus" = 'converted' AND
    "rating" IN ('negative', 'positive') AND
    "reviewerSubject" IS NOT NULL AND
    "reviewReason" IS NOT NULL AND
    "reviewedAt" IS NOT NULL AND
    "convertedAt" IS NOT NULL
  )
  ), false)`,
)
export class ObservabilityFeedbackEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  generationId: string;

  @Column('text')
  actorKeyHash: string;

  @Column('text')
  source: ObservabilityFeedbackSource;

  @Column('text')
  metric: ObservabilityFeedbackMetric;

  @Column('text')
  rating: ObservabilityFeedbackRating;

  @Column('jsonb', { default: [] })
  reasonCodes: ObservabilityFeedbackReason[];

  @Column('text', { nullable: true })
  comment?: string;

  @Column('text', { nullable: true })
  reviewStatus: ObservabilityFeedbackReviewStatus | null;

  @Column('text', { nullable: true })
  reviewerSubject: string | null;

  @Column('text', { nullable: true })
  reviewReason: string | null;

  @Column('timestamptz', { nullable: true })
  reviewedAt: Date | null;

  @Column('timestamptz', { nullable: true })
  convertedAt: Date | null;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  updatedAt: Date;
}
