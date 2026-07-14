import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { AgentEntity } from '../../agents/infrastructure/agent.entity';
import type { MemoryStatus, MemoryType } from '../domain/agent-memory';

@Index(
  'IDX_agent_memories_stable_content',
  ['agentId', 'ownerKey', 'content'],
  {
    unique: true,
    where: `"type" <> 'episodic'`,
  },
)
@Entity('agent_memories')
export class AgentMemoryEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  agentId: string;

  @ManyToOne(() => AgentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: AgentEntity;

  @Index()
  @Column('text')
  ownerKey: string;

  @Column('text')
  type: MemoryType;

  @Column('text')
  content: string;

  @Column('text', { nullable: true })
  sourceThreadId?: string;

  @Column('text', { default: 'ready' })
  status: MemoryStatus;

  @Column('integer')
  importance: number;

  @Column('integer', { default: 0 })
  accessCount: number;

  @Column('datetime', { nullable: true })
  lastAccessedAt?: Date;

  @Column('datetime')
  createdAt: Date;

  @Index()
  @Column('datetime')
  updatedAt: Date;
}
