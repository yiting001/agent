import type { SystemStatus } from '../domain/system-status';

/** External health source required by the system application logic. */
export interface HealthStatusGateway {
  getHealthStatus(): Promise<SystemStatus>;
}
