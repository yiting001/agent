import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { IngestionJobStatus } from '../../domain/knowledge-upload';

@Entity('knowledge_ingestion_jobs')
@Index(['status', 'createdAt'])
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

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('datetime', { nullable: true })
  startedAt?: Date;

  @Column('datetime', { nullable: true })
  completedAt?: Date;

  @Column('datetime')
  createdAt: Date;
}
