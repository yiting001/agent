import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type {
  ObservabilityGenerationConfiguration,
  ObservabilityGenerationStatus,
} from '../domain/observability-generation';

@Entity('observability_generations')
export class ObservabilityGenerationEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  traceId: string;

  @Index()
  @Column('text')
  agentId: string;

  @Column('text', { nullable: true })
  conversationId?: string;

  @Column('text', { nullable: true })
  actorKeyHash?: string;

  @Column('text')
  source: string;

  @Column('text')
  providerId: string;

  @Column('text')
  providerName: string;

  @Column('text')
  requestedModel: string;

  @Column('text', { nullable: true })
  responseModel?: string;

  @Column('text', { nullable: true })
  upstreamResponseId?: string;

  @Column('jsonb', { default: [] })
  finishReasons: string[];

  @Column('jsonb', { default: {} })
  configuration: ObservabilityGenerationConfiguration;

  @Column('text')
  status: ObservabilityGenerationStatus;

  @Column('timestamptz')
  startedAt: Date;

  @Column('timestamptz', { nullable: true })
  completedAt?: Date;
}
