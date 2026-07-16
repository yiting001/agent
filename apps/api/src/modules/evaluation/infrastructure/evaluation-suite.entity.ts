import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { EvaluationSuiteStatus } from '../domain/evaluation';

@Entity('evaluation_suites')
export class EvaluationSuiteEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  agentId: string;

  @Column('text')
  name: string;

  @Column('text')
  description: string;

  @Column('text')
  status: EvaluationSuiteStatus;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  updatedAt: Date;
}
