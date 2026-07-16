import { Injectable } from '@nestjs/common';

import type {
  ObservabilityEvent,
  ObservabilityTracePage,
} from '../domain/observability-event';
import { ObservabilityEventRepository } from './observability-event.repository';
import { buildObservabilityTraceSummary } from './observability-trace.mapper';

@Injectable()
export class ListObservabilityTracesUseCase {
  constructor(private readonly repository: ObservabilityEventRepository) {}

  async execute(
    hours: number,
    page: number,
    pageSize: number,
    cursorStartedAt?: string,
    cursorTraceId?: string,
  ): Promise<ObservabilityTracePage> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1_000);
    const cursor =
      cursorStartedAt && cursorTraceId
        ? { startedAt: new Date(cursorStartedAt), traceId: cursorTraceId }
        : undefined;
    const result = await this.repository.findTracePage({
      cursor,
      limit: pageSize,
      offset: cursor ? 0 : (page - 1) * pageSize,
      since,
    });
    const eventsByTraceId = this.groupEvents(result.events);
    const items = result.traceIds
      .map((traceId) =>
        buildObservabilityTraceSummary(
          traceId,
          eventsByTraceId.get(traceId) ?? [],
        ),
      )
      .filter((trace) => trace !== undefined);

    const lastItem = items[items.length - 1];

    return {
      items,
      ...(lastItem
        ? {
            nextCursor: {
              startedAt: lastItem.startedAt,
              traceId: lastItem.traceId,
            },
          }
        : {}),
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  private groupEvents(
    events: ObservabilityEvent[],
  ): Map<string, ObservabilityEvent[]> {
    const grouped = new Map<string, ObservabilityEvent[]>();

    for (const event of events) {
      const trace = grouped.get(event.traceId) ?? [];

      trace.push(event);
      grouped.set(event.traceId, trace);
    }

    return grouped;
  }
}
