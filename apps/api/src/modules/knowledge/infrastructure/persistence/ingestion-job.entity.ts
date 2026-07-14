import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { IngestionJobStatus } from '../../domain/knowledge-upload';

@Entity('knowledge_ingestion_jobs')
@Index('IDX_ingestion_jobs_claim', ['status', 'nextRunAt'])
@Index('IDX_ingestion_jobs_reclaim', ['status', 'lockedAt'])
export class IngestionJobEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  documentId: string;

  @Column('text')
  status: IngestionJobStatus;

  @Column('integer')
  progress: number;

  @Column('integer')
  attempts: number;

  @Column('integer')
  maxAttempts: number;

  @Column('timestamptz')
  nextRunAt: Date;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('timestamptz', { nullable: true })
  startedAt?: Date;

  @Column('timestamptz', { nullable: true })
  completedAt?: Date;

  @Column('timestamptz', { nullable: true })
  lockedAt?: Date;

  @Column('text', { nullable: true })
  lockOwner?: string;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  updatedAt: Date;
}
