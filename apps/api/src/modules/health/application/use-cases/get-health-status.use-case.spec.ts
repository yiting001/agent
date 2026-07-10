import type { Clock } from '../ports/clock.port';
import { GetHealthStatusUseCase } from './get-health-status.use-case';

describe('GetHealthStatusUseCase', () => {
  it('returns a stable service status with the injected time', () => {
    const currentTime = new Date('2026-01-01T00:00:00.000Z');
    const clock: Clock = { now: () => currentTime };
    const useCase = new GetHealthStatusUseCase(clock, 'test-service');

    expect(useCase.execute()).toEqual({
      service: 'test-service',
      status: 'ok',
      timestamp: currentTime.toISOString(),
    });
  });
});
