import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ManagementAuditRepository } from '../application/management-audit.repository';
import type { ManagementAuditLog } from '../domain/management-access';
import { ManagementAuditLogEntity } from './management-audit-log.entity';

@Injectable()
export class TypeOrmManagementAuditRepository extends ManagementAuditRepository {
  constructor(
    @InjectRepository(ManagementAuditLogEntity)
    private readonly repository: Repository<ManagementAuditLogEntity>,
  ) {
    super();
  }

  async save(log: ManagementAuditLog): Promise<void> {
    await this.repository.save(log);
  }
}
