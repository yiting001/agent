import type { HealthStatus } from '../../domain/health-status';
import type { Clock } from '../ports/clock.port';

/** Builds the current service health representation. */
export class GetHealthStatusUseCase {
  constructor(
    private readonly clock: Clock,
    private readonly serviceName: string,
  ) {}

  execute(): HealthStatus {
    return {
      service: this.serviceName,
      status: 'ok',
      timestamp: this.clock.now().toISOString(),
    };
  }
}
