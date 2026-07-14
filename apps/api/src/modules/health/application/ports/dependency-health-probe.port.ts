/** 依赖探测结果；disabled 表示该依赖未配置。 */
export type DependencyHealth = 'disabled' | 'ok' | 'unavailable';

/** readiness 所需的基础设施依赖状态。 */
export interface DependencyHealthStatus {
  database: DependencyHealth;
  pgvector: DependencyHealth;
  redis: DependencyHealth;
}

/** 数据库、pgvector 和 Redis 的 readiness 探测端口。 */
export abstract class DependencyHealthProbe {
  abstract check(): Promise<DependencyHealthStatus>;
}
