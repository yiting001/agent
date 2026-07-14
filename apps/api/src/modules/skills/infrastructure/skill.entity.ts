import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { SkillTool, SkillType } from '../domain/skill';

@Entity('skills')
export class SkillEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  description: string;

  @Column('text')
  type: SkillType;

  @Column('text', { default: '' })
  content: string;

  @Column('text', { default: '' })
  endpoint: string;

  @Column('jsonb')
  headers: Record<string, string>;

  @Column('jsonb')
  tools: SkillTool[];

  @Column('boolean', { default: true })
  enabled: boolean;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  updatedAt: Date;
}
