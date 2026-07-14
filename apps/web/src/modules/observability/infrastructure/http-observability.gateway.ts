import type { HttpClient } from '@/shared/http/http-client';

import { ObservabilityGateway } from '../application/observability.gateway';
import type { ObservabilityDashboard } from '../domain/observability-dashboard';

export class HttpObservabilityGateway extends ObservabilityGateway {
  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  getDashboard(hours: number): Promise<ObservabilityDashboard> {
    return this.httpClient.get<ObservabilityDashboard>(
      `/observability/dashboard?hours=${hours}`,
    );
  }
}
