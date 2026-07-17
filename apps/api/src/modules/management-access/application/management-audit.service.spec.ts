import type { ManagementAuditLog } from '../domain/management-access';
import { ManagementAuditRepository } from './management-audit.repository';
import { ManagementAuditService } from './management-audit.service';

class CapturingManagementAuditRepository extends ManagementAuditRepository {
  saved?: ManagementAuditLog;

  save(log: ManagementAuditLog): Promise<void> {
    this.saved = log;
    return Promise.resolve();
  }
}

describe('ManagementAuditService', () => {
  it('persists the fixed low-sensitive audit shape', async () => {
    const repository = new CapturingManagementAuditRepository();
    const service = new ManagementAuditService(repository);

    await service.record({
      action: 'feedback.accept',
      metadata: {
        method: 'POST',
        requiredScopes: ['observability:feedback'],
        statusCode: 200,
      },
      resourceId: 'feedback-id',
      resourceType: 'observability-feedback',
      result: 'succeeded',
      subject: 'reviewer',
    });

    const saved = repository.saved;

    expect(saved?.createdAt).toBeInstanceOf(Date);
    expect(typeof saved?.id).toBe('string');
    expect(saved).toEqual({
      action: 'feedback.accept',
      createdAt: saved?.createdAt,
      id: saved?.id,
      metadata: {
        method: 'POST',
        requiredScopes: ['observability:feedback'],
        statusCode: 200,
      },
      resourceId: 'feedback-id',
      resourceType: 'observability-feedback',
      result: 'succeeded',
      subject: 'reviewer',
    });
  });
});
