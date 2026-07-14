export type DependencyHealth = 'disabled' | 'ok' | 'unavailable';

export interface DependencyHealthStatus {
  database: DependencyHealth;
  pgvector: DependencyHealth;
  redis: DependencyHealth;
}

export abstract class DependencyHealthProbe {
  abstract check(): Promise<DependencyHealthStatus>;
}
