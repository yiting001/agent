import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { AgentEntity } from '../../agents/infrastructure/agent.entity';
import type { MemorySource } from '../domain/agent-memory';

@Entity('agent_memory_threads')
export class AgentMemoryThreadEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  agentId: string;

  @ManyToOne(() => AgentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: AgentEntity;

  @Index()
  @PrimaryColumn('text')
  ownerKey: string;

  @Column('text')
  source: MemorySource;

  @Column('text')
  title: string;

  @Column('timestamptz')
  createdAt: Date;

  @Index()
  @Column('timestamptz')
  updatedAt: Date;
}
