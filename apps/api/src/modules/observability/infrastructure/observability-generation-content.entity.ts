import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type {
  ObservabilityCaptureMode,
  ObservabilityGenerationMessage,
} from '../domain/observability-generation';

@Entity('observability_generation_contents')
export class ObservabilityGenerationContentEntity {
  @PrimaryColumn('text')
  generationId: string;

  @Column('text')
  captureMode: ObservabilityCaptureMode;

  @Column('jsonb', { default: [] })
  inputMessages: ObservabilityGenerationMessage[];

  @Column('text', { default: '' })
  outputText: string;

  @Column('integer', { default: 0 })
  redactionCount: number;

  @Column('boolean', { default: false })
  truncated: boolean;

  @Index()
  @Column('timestamptz')
  expiresAt: Date;
}
