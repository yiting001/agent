import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { EvaluationMetricKind } from '../domain/evaluation';

@Entity('evaluation_metrics')
export class EvaluationMetricEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  suiteId: string;

  @Column('text')
  name: string;

  @Column('text')
  kind: EvaluationMetricKind;

  @Column('real')
  weight: number;

  @Column('real')
  passingThreshold: number;
}
