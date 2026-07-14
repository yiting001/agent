/** 不依赖外部基础设施的公开存活状态。 */
export interface HealthStatus {
  readonly service: string;
  readonly status: 'ok';
  readonly timestamp: string;
}
