import type { ObservabilityDashboard } from '../domain/observability-dashboard';

/** 获取观测仪表盘聚合数据的应用层端口。 */
export abstract class ObservabilityGateway {
  abstract getDashboard(hours: number): Promise<ObservabilityDashboard>;
}
