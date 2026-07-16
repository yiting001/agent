import { Column, Entity, Index, PrimaryColumn, Unique } from 'typeorm';

import type {
  ObservabilityFeedbackMetric,
  ObservabilityFeedbackRating,
  ObservabilityFeedbackReason,
  ObservabilityFeedbackSource,
} from '../domain/observability-generation';

@Entity('observability_feedback')
@Unique('UQ_observability_feedback_actor_metric', [
  'generationId',
  'actorKeyHash',
  'metric',
])
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

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  updatedAt: Date;
}
