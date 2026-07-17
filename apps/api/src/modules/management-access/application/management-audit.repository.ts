import type { ManagementAuditLog } from '../domain/management-access';

export abstract class ManagementAuditRepository {
  abstract save(log: ManagementAuditLog): Promise<void>;
}
