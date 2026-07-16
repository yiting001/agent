import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';

import {
  ObservabilityEventRepository,
  type FindObservabilityTracePageInput,
  type ObservabilityTraceEventPage,
} from '../application/observability-event.repository';
import type { ObservabilityEvent } from '../domain/observability-event';
import { ObservabilityEventEntity } from './observability-event.entity';

function toDomain(entity: ObservabilityEventEntity): ObservabilityEvent {
  return {
    agentId: entity.agentId,
    alertMessage: entity.alertMessage,
    alertSeverity: entity.alertSeverity,
    category: entity.category,
    costUsdMicros: entity.costUsdMicros,
    durationMs: entity.durationMs,
    errorMessage: entity.errorMessage,
    id: entity.id,
    inputTokens: entity.inputTokens,
    metadata: entity.metadata,
    method: entity.method,
    model: entity.model,
    operation: entity.operation,
    outputTokens: entity.outputTokens,
    parentSpanId: entity.parentSpanId,
    providerId: entity.providerId,
    route: entity.route,
    spanId: entity.spanId,
    startedAt: entity.startedAt,
    status: entity.status,
    statusCode: entity.statusCode,
    tokenCountSource: entity.tokenCountSource,
    traceId: entity.traceId,
  };
}

@Injectable()
export class TypeOrmObservabilityEventRepository extends ObservabilityEventRepository {
  constructor(
    @InjectRepository(ObservabilityEventEntity)
    private readonly repository: Repository<ObservabilityEventEntity>,
  ) {
    super();
  }

  async deleteBefore(cutoff: Date): Promise<void> {
    await this.repository.delete({ startedAt: LessThan(cutoff) });
  }

  async findByTraceId(traceId: string): Promise<ObservabilityEvent[]> {
    const events = await this.repository.find({
      order: { startedAt: 'ASC' },
      where: { traceId },
    });

    return events.map(toDomain);
  }

  async findSince(since: Date): Promise<ObservabilityEvent[]> {
    const events = await this.repository.find({
      order: { startedAt: 'DESC' },
      where: { startedAt: MoreThanOrEqual(since) },
    });

    return events.map(toDomain);
  }

  async findTracePage(
    input: FindObservabilityTracePageInput,
  ): Promise<ObservabilityTraceEventPage> {
    const traceQuery = this.repository
      .createQueryBuilder('event')
      .select('event.traceId', 'traceId')
      .addSelect('MIN(event.startedAt)', 'startedAt')
      .where('event.startedAt >= :since', { since: input.since })
      .groupBy('event.traceId')
      .orderBy('MIN(event.startedAt)', 'DESC')
      .addOrderBy('event.traceId', 'ASC')
      .limit(input.limit);

    if (input.cursor) {
      traceQuery.having(
        '(MIN(event.startedAt) < :cursorStartedAt OR (MIN(event.startedAt) = :cursorStartedAt AND event.traceId > :cursorTraceId))',
        {
          cursorStartedAt: input.cursor.startedAt,
          cursorTraceId: input.cursor.traceId,
        },
      );
    } else {
      traceQuery.offset(input.offset);
    }

    const countQuery = this.repository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.traceId)', 'total')
      .where('event.startedAt >= :since', { since: input.since });
    const [traceRows, countRow] = await Promise.all([
      traceQuery.getRawMany<{ traceId: string }>(),
      countQuery.getRawOne<{ total: string }>(),
    ]);
    const traceIds = traceRows.map((row) => row.traceId);

    if (traceIds.length === 0) {
      return { events: [], total: Number(countRow?.total ?? 0), traceIds };
    }

    const events = await this.repository.find({
      order: { startedAt: 'ASC' },
      where: { traceId: In(traceIds) },
    });

    return {
      events: events.map(toDomain),
      total: Number(countRow?.total ?? 0),
      traceIds,
    };
  }

  async save(event: ObservabilityEvent): Promise<void> {
    await this.repository.save(event);
  }
}
