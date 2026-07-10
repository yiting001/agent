import type { HttpClient } from '@/shared/http/http-client';

import type { HealthStatusGateway } from '../application/health-status.gateway';
import type { SystemStatus } from '../domain/system-status';

function isSystemStatus(value: unknown): value is SystemStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.service === 'string' &&
    candidate.status === 'ok' &&
    typeof candidate.timestamp === 'string'
  );
}

/** Maps the API health resource into the system domain contract. */
export class HttpHealthStatusGateway implements HealthStatusGateway {
  constructor(private readonly httpClient: HttpClient) {}

  async getHealthStatus(): Promise<SystemStatus> {
    const response = await this.httpClient.get('/health');

    if (!isSystemStatus(response)) {
      throw new Error('The health endpoint returned an invalid response.');
    }

    return response;
  }
}
