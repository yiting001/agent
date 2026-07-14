import type { ObservabilityDashboard } from '../domain/observability-dashboard';

export abstract class ObservabilityGateway {
  abstract getDashboard(hours: number): Promise<ObservabilityDashboard>;
}
