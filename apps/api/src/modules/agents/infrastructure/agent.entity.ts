import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { AgentStatus } from '../domain/agent';

@Entity('agents')
export class AgentEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  description: string;

  @Column('text')
  systemPrompt: string;

  @Column('text')
  providerId: string;

  @Column('real', { default: 0.2 })
  temperature: number;

  @Column('text')
  status: AgentStatus;

  @Column('integer', { default: 0 })
  conversationCount: number;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  updatedAt: Date;
}
