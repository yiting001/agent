import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('agent_skills')
@Index(['agentId', 'skillId'], { unique: true })
export class AgentSkillEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  agentId: string;

  @Column('text')
  skillId: string;
}
