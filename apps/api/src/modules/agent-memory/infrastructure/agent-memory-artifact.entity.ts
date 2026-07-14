import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { AgentEntity } from '../../agents/infrastructure/agent.entity';
import { AgentMemoryEntity } from './agent-memory.entity';

@Index(
  'IDX_agent_memory_artifacts_memory_attachment',
  ['memoryId', 'attachmentId'],
  { unique: true },
)
@Index('IDX_agent_memory_artifacts_agent_owner', ['agentId', 'ownerKey'])
@Entity('agent_memory_artifacts')
export class AgentMemoryArtifactEntity {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  memoryId: string;

  @ManyToOne(() => AgentMemoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memoryId' })
  memory: AgentMemoryEntity;

  @Index()
  @Column('text')
  agentId: string;

  @ManyToOne(() => AgentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: AgentEntity;

  @Index()
  @Column('text')
  ownerKey: string;

  @Index()
  @Column('text')
  attachmentId: string;

  @Column('text')
  fileName: string;

  @Column('text')
  mimeType: string;

  @Column('integer')
  sizeBytes: number;

  @Column('timestamptz')
  createdAt: Date;
}
