import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { EvaluationCaseResultStatus } from '../domain/evaluation';

@Entity('evaluation_case_results')
export class EvaluationCaseResultEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  runId: string;

  @Column('text')
  caseId: string;

  @Column('text')
  status: EvaluationCaseResultStatus;

  @Column('real')
  score: number;

  @Column('text')
  answer: string;

  @Column('text')
  input: string;

  @Column('integer')
  sequence: number;

  @Column('jsonb')
  matchedKeywords: string[];

  @Column('jsonb')
  missingKeywords: string[];

  @Column('text', { nullable: true })
  errorMessage?: string;
}
