import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('agent_knowledge_modules')
@Index(['agentId', 'moduleId'], { unique: true })
export class AgentKnowledgeModuleEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  agentId: string;

  @Column('text')
  moduleId: string;
}
