import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('evaluation_cases')
export class EvaluationCaseEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  suiteId: string;

  @Column('text')
  input: string;

  @Column('jsonb')
  expectedKeywords: string[];
}
