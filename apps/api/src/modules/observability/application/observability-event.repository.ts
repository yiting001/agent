import type { ObservabilityEvent } from '../domain/observability-event';

export abstract class ObservabilityEventRepository {
  abstract deleteBefore(cutoff: Date): Promise<void>;
  abstract findSince(since: Date): Promise<ObservabilityEvent[]>;
  abstract save(event: ObservabilityEvent): Promise<void>;
}
