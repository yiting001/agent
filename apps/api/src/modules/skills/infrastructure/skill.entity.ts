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

  @Column('simple-json')
  headers: Record<string, string>;

  @Column('simple-json')
  tools: SkillTool[];

  @Column('boolean', { default: true })
  enabled: boolean;

  @Column('datetime')
  createdAt: Date;

  @Column('datetime')
  updatedAt: Date;
}
