import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { AgentEntity } from '../../agents/infrastructure/agent.entity';
import type { ApiApplicationStatus } from '../domain/api-application';

@Entity('api_applications')
export class ApiApplicationEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  agentId: string;

  @ManyToOne(() => AgentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: AgentEntity;

  @Index({ unique: true })
  @Column('text')
  keyHash: string;

  @Column('text')
  maskedKey: string;

  @Column('text')
  status: ApiApplicationStatus;

  @Column('integer', { default: 0 })
  requestCount: number;

  @Column('datetime')
  createdAt: Date;
}
