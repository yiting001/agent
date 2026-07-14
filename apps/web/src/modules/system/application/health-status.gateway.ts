import type { SystemStatus } from '../domain/system-status';

/** 系统状态应用逻辑依赖的外部健康数据端口。 */
export interface HealthStatusGateway {
  getHealthStatus(): Promise<SystemStatus>;
}
