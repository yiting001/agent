import type { DependencyHealthStatus } from '../application/ports/dependency-health-probe.port';

export interface ReadinessStatus {
  readonly dependencies: DependencyHealthStatus;
  readonly service: string;
  readonly status: 'not_ready' | 'ready';
  readonly timestamp: string;
}
