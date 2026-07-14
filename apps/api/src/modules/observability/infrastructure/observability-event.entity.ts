import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type {
  ObservabilityAlertSeverity,
  ObservabilityCategory,
  ObservabilityStatus,
  TokenCountSource,
} from '../domain/observability-event';

@Entity('observability_events')
export class ObservabilityEventEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  traceId: string;

  @Column('text')
  spanId: string;

  @Column('text', { nullable: true })
  parentSpanId?: string;

  @Column('text')
  category: ObservabilityCategory;

  @Column('text')
  operation: string;

  @Column('text')
  status: ObservabilityStatus;

  @Index()
  @Column('timestamptz')
  startedAt: Date;

  @Column('real')
  durationMs: number;

  @Column('text', { nullable: true })
  method?: string;

  @Column('text', { nullable: true })
  route?: string;

  @Column('integer', { nullable: true })
  statusCode?: number;

  @Column('text', { nullable: true })
  agentId?: string;

  @Column('text', { nullable: true })
  providerId?: string;

  @Column('text', { nullable: true })
  model?: string;

  @Column('integer', { default: 0 })
  inputTokens: number;

  @Column('integer', { default: 0 })
  outputTokens: number;

  @Column('text', { default: 'unavailable' })
  tokenCountSource: TokenCountSource;

  @Column('integer', { default: 0 })
  costUsdMicros: number;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('text', { nullable: true })
  alertSeverity?: ObservabilityAlertSeverity;

  @Column('text', { nullable: true })
  alertMessage?: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, string | number | boolean>;
}
