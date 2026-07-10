import type { SystemStatus } from '../domain/system-status';
import type { HealthStatusGateway } from './health-status.gateway';

/** Retrieves the latest status without exposing the transport mechanism. */
export class GetSystemStatus {
  constructor(private readonly healthStatusGateway: HealthStatusGateway) {}

  execute(): Promise<SystemStatus> {
    return this.healthStatusGateway.getHealthStatus();
  }
}
