import { Check, Column, Entity, PrimaryColumn, Unique } from 'typeorm';

import type { EvaluationCaseSource } from '../domain/evaluation';

@Entity('evaluation_cases')
@Unique('UQ_evaluation_cases_source_feedback', ['sourceFeedbackId'])
@Check(
  'CHK_evaluation_cases_source',
  `(
    "source" = 'manual' AND
    "sourceGenerationId" IS NULL AND
    "sourceFeedbackId" IS NULL
  ) OR (
    "source" = 'feedback' AND
    "sourceGenerationId" IS NOT NULL AND
    "sourceFeedbackId" IS NOT NULL
  )`,
)
export class EvaluationCaseEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  suiteId: string;

  @Column('text')
  input: string;

  @Column('jsonb')
  expectedKeywords: string[];

  @Column('text', { nullable: true })
  expectedOutput?: string;

  @Column('text', { nullable: true })
  evaluationCriteria?: string;

  @Column('jsonb', { default: [] })
  tags: string[];

  @Column('text', { default: 'manual' })
  source: EvaluationCaseSource;

  @Column('text', { nullable: true })
  sourceGenerationId?: string;

  @Column('text', { nullable: true })
  sourceFeedbackId?: string;
}
