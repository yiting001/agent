import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { ApiApplicationStatus } from '../domain/api-application';

@Entity('api_applications')
export class ApiApplicationEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  agentId: string;

  @Index({ unique: true })
  @Column('text')
  keyHash: string;

  @Column('text')
  maskedKey: string;

  @Column('text')
  status: ApiApplicationStatus;

  @Column('integer', { default: 0 })
  requestCount: number;

  @Column('timestamptz')
  createdAt: Date;
}
