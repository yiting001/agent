import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { AgentMemoryThreadEntity } from './agent-memory-thread.entity';

@Entity('agent_memory_messages')
export class AgentMemoryMessageEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  threadId: string;

  @Index()
  @Column('text')
  ownerKey: string;

  @ManyToOne(() => AgentMemoryThreadEntity, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'threadId', referencedColumnName: 'id' },
    { name: 'ownerKey', referencedColumnName: 'ownerKey' },
  ])
  thread: AgentMemoryThreadEntity;

  @Column('text')
  role: 'assistant' | 'user';

  @Column('text')
  content: string;

  @Column('integer')
  position: number;

  @Index()
  @Column('datetime')
  createdAt: Date;
}
