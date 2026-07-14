import type { ObservabilityEvent } from '../domain/observability-event';

/** 观测事件的追加写与保留期清理端口。 */
export abstract class ObservabilityEventRepository {
  /** 删除保留期之前的事件，调用方负责提供明确截止时间。 */
  abstract deleteBefore(cutoff: Date): Promise<void>;
  abstract findSince(since: Date): Promise<ObservabilityEvent[]>;
  abstract save(event: ObservabilityEvent): Promise<void>;
}
