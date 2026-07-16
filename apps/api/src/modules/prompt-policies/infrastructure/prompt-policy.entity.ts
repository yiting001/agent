import { Column, Entity, PrimaryColumn } from 'typeorm';

import type {
  PromptPolicyCategory,
  PromptPolicySource,
} from '../domain/prompt-policy';

@Entity('prompt_policies')
export class PromptPolicyEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { unique: true })
  key: string;

  @Column('text')
  name: string;

  @Column('text')
  description: string;

  @Column('text')
  category: PromptPolicyCategory;

  @Column('text')
  source: PromptPolicySource;

  @Column('text')
  content: string;

  @Column('boolean', { default: true })
  enabled: boolean;

  @Column('integer')
  priority: number;

  @Column('integer', { default: 1 })
  revision: number;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  updatedAt: Date;
}
