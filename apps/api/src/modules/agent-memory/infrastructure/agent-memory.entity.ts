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
@Index(
  'UQ_agent_memories_episode_idempotency',
  ['agentId', 'ownerKey', 'idempotencyKey'],
  {
    unique: true,
    where: `"type" = 'episodic' AND "idempotencyKey" IS NOT NULL`,
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
  idempotencyKey?: string;

  @Column('text', { nullable: true })
  sourceThreadId?: string;

  @Column('text', { default: 'ready' })
  status: MemoryStatus;

  @Column('integer')
  importance: number;

  @Column('timestamptz', { nullable: true })
  indexedAt?: Date | null;

  @Column('integer', { default: 0 })
  accessCount: number;

  @Column('timestamptz', { nullable: true })
  lastAccessedAt?: Date;

  @Column('timestamptz')
  createdAt: Date;

  @Index()
  @Column('timestamptz')
  updatedAt: Date;
}
