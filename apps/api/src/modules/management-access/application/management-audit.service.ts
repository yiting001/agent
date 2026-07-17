import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  ManagementAuditMetadata,
  ManagementAuditResult,
} from '../domain/management-access';
import { ManagementAuditRepository } from './management-audit.repository';

export interface RecordManagementAuditInput {
  action: string;
  metadata?: ManagementAuditMetadata;
  resourceId?: string;
  resourceType: string;
  result: ManagementAuditResult;
  subject: string;
}

/** Persists only stable action identity and explicitly low-sensitive metadata. */
@Injectable()
export class ManagementAuditService {
  constructor(private readonly repository: ManagementAuditRepository) {}

  record(input: RecordManagementAuditInput): Promise<void> {
    return this.repository.save({
      action: input.action,
      createdAt: new Date(),
      id: randomUUID(),
      metadata: input.metadata ?? {},
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      result: input.result,
      subject: input.subject,
    });
  }
}
