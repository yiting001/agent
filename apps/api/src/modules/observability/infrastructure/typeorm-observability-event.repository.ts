import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';

import { ObservabilityEventRepository } from '../application/observability-event.repository';
import type { ObservabilityEvent } from '../domain/observability-event';
import { ObservabilityEventEntity } from './observability-event.entity';

function toDomain(entity: ObservabilityEventEntity): ObservabilityEvent {
  let metadata: unknown = {};

  try {
    metadata = JSON.parse(entity.metadata);
  } catch {
    metadata = {};
  }

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
    metadata:
      typeof metadata === 'object' && metadata !== null
        ? (metadata as Record<string, string | number | boolean>)
        : {},
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

  async findSince(since: Date): Promise<ObservabilityEvent[]> {
    const events = await this.repository.find({
      order: { startedAt: 'DESC' },
      where: { startedAt: MoreThanOrEqual(since) },
    });

    return events.map(toDomain);
  }

  async save(event: ObservabilityEvent): Promise<void> {
    await this.repository.save({
      ...event,
      metadata: JSON.stringify(event.metadata),
    });
  }
}
