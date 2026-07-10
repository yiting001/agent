import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { AgentEntity } from './agent.entity';

@Entity('agent_knowledge_modules')
@Index(['agentId', 'moduleId'], { unique: true })
export class AgentKnowledgeModuleEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  agentId: string;

  @ManyToOne(() => AgentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: AgentEntity;

  @Column('text')
  moduleId: string;
}
