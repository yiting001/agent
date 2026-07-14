import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { RedisConnection } from '../../../shared/infrastructure/redis/redis-connection';
import {
  DependencyHealthProbe,
  type DependencyHealth,
  type DependencyHealthStatus,
} from '../application/ports/dependency-health-probe.port';

@Injectable()
export class PostgresRedisHealthProbe extends DependencyHealthProbe {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisConnection,
  ) {
    super();
  }

  async check(): Promise<DependencyHealthStatus> {
    const database = await this.checkDatabase();
    const pgvector =
      database === 'ok' ? await this.checkPgvector() : 'unavailable';
    const redis = await this.checkRedis();

    return { database, pgvector, redis };
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }

  private async checkPgvector(): Promise<DependencyHealth> {
    try {
      const rows = await this.dataSource.query<Array<{ '?column?': number }>>(
        `SELECT 1 FROM pg_extension WHERE extname = 'vector'`,
      );

      return rows.length > 0 ? 'ok' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    try {
      return await this.redis.ping();
    } catch {
      return 'unavailable';
    }
  }
}
