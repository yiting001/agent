import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type {
  ObservabilityCaptureMode,
  ObservabilityGenerationMessage,
} from '../domain/observability-generation';

@Entity('observability_generation_contents')
@Check(
  'CHK_observability_generation_contents_storage',
  `(
    "inputMessages" IS NOT NULL AND
    "outputText" IS NOT NULL AND
    "ciphertext" IS NULL AND
    "initializationVector" IS NULL AND
    "authTag" IS NULL AND
    "keyVersion" IS NULL
  ) OR (
    "inputMessages" IS NULL AND
    "outputText" IS NULL AND
    "ciphertext" IS NOT NULL AND
    "initializationVector" IS NOT NULL AND
    "authTag" IS NOT NULL AND
    "keyVersion" IS NOT NULL
  )`,
)
export class ObservabilityGenerationContentEntity {
  @PrimaryColumn('text')
  generationId: string;

  @Column('text')
  captureMode: ObservabilityCaptureMode;

  @Column('jsonb', { nullable: true })
  inputMessages: ObservabilityGenerationMessage[] | null;

  @Column('text', { nullable: true })
  outputText: string | null;

  @Column('text', { nullable: true })
  ciphertext: string | null;

  @Column('text', { nullable: true })
  initializationVector: string | null;

  @Column('text', { nullable: true })
  authTag: string | null;

  @Column('text', { nullable: true })
  keyVersion: string | null;

  @Column('integer', { default: 0 })
  redactionCount: number;

  @Column('boolean', { default: false })
  truncated: boolean;

  @Index()
  @Column('timestamptz')
  expiresAt: Date;
}
