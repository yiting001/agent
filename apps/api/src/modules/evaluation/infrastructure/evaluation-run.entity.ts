import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { EvaluationRunStatus } from '../domain/evaluation';

@Entity('evaluation_runs')
export class EvaluationRunEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  suiteId: string;

  @Column('text')
  agentId: string;

  @Column('text')
  status: EvaluationRunStatus;

  @Column('real')
  score: number;

  @Column('integer')
  totalCases: number;

  @Column('timestamptz')
  startedAt: Date;

  @Column('timestamptz', { nullable: true })
  completedAt?: Date;

  @Column('text', { nullable: true })
  errorMessage?: string;
}
