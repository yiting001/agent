import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import type {
  AgentMemoryTaskKind,
  AgentMemoryTaskStatus,
} from '../domain/agent-memory-task';
import { AgentMemoryEntity } from './agent-memory.entity';

@Index('UQ_agent_memory_tasks_memory_kind', ['memoryId', 'kind'], {
  unique: true,
})
@Index('IDX_agent_memory_tasks_claim', ['status', 'nextRunAt'])
@Index('IDX_agent_memory_tasks_reclaim', ['status', 'lockedAt'])
@Index('IDX_agent_memory_tasks_owner', ['agentId', 'ownerKey', 'status'])
@Entity('agent_memory_tasks')
export class AgentMemoryTaskEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  memoryId: string;

  @ManyToOne(() => AgentMemoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memoryId' })
  memory: AgentMemoryEntity;

  @Column('text')
  agentId: string;

  @Column('text')
  ownerKey: string;

  @Column('text')
  kind: AgentMemoryTaskKind;

  @Column('text')
  status: AgentMemoryTaskStatus;

  @Column('integer')
  attempts: number;

  @Column('integer')
  maxAttempts: number;

  @Column('datetime')
  nextRunAt: Date;

  @Column('datetime', { nullable: true })
  lockedAt?: Date | null;

  @Column('text', { nullable: true })
  lockOwner?: string | null;

  @Column('text', { nullable: true })
  lastError?: string | null;

  @Column('text', { nullable: true })
  embeddingJson?: string;

  @Column('integer', { nullable: true })
  embeddingDimensions?: number;

  @Column('datetime')
  createdAt: Date;

  @Column('datetime')
  updatedAt: Date;

  @Column('datetime', { nullable: true })
  completedAt?: Date | null;
}
