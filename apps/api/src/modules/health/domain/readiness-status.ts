import type { DependencyHealthStatus } from '../application/ports/dependency-health-probe.port';

/** 包含基础设施依赖明细的就绪状态。 */
export interface ReadinessStatus {
  readonly dependencies: DependencyHealthStatus;
  readonly service: string;
  readonly status: 'not_ready' | 'ready';
  readonly timestamp: string;
}
