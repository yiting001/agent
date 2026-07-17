import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type {
  ManagementAuditMetadata,
  ManagementAuditResult,
} from '../domain/management-access';

@Entity('management_audit_logs')
@Index('IDX_management_audit_logs_subject_created', ['subject', 'createdAt'])
export class ManagementAuditLogEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  subject: string;

  @Column('text')
  action: string;

  @Column('text')
  resourceType: string;

  @Column('text', { nullable: true })
  resourceId?: string;

  @Column('text')
  result: ManagementAuditResult;

  @Column('jsonb', { default: {} })
  metadata: ManagementAuditMetadata;

  @Index('IDX_management_audit_logs_created')
  @Column('timestamptz')
  createdAt: Date;
}
