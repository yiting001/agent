import { describe, expect, it } from 'vitest';

import type { HealthStatusGateway } from './health-status.gateway';
import { GetSystemStatus } from './get-system-status';

describe('GetSystemStatus', () => {
  it('returns the status supplied by its gateway', async () => {
    const expectedStatus = {
      service: 'agent-api',
      status: 'ok' as const,
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    const gateway: HealthStatusGateway = {
      getHealthStatus: () => Promise.resolve(expectedStatus),
    };

    await expect(new GetSystemStatus(gateway).execute()).resolves.toEqual(
      expectedStatus,
    );
  });
});
