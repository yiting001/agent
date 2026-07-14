import type { ReadinessStatus } from '../../domain/readiness-status';
import type { Clock } from '../ports/clock.port';
import { DependencyHealthProbe } from '../ports/dependency-health-probe.port';

export class GetReadinessStatusUseCase {
  constructor(
    private readonly dependencies: DependencyHealthProbe,
    private readonly clock: Clock,
    private readonly serviceName: string,
  ) {}

  async execute(): Promise<ReadinessStatus> {
    const dependencies = await this.dependencies.check();
    const ready =
      dependencies.database === 'ok' &&
      dependencies.pgvector === 'ok' &&
      dependencies.redis !== 'unavailable';

    return {
      dependencies,
      service: this.serviceName,
      status: ready ? 'ready' : 'not_ready',
      timestamp: this.clock.now().toISOString(),
    };
  }
}
