import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { ObservabilityTraceDetail } from '../domain/observability-event';
import { ObservabilityEventRepository } from './observability-event.repository';
import { ObservabilityGenerationRepository } from './observability-generation.repository';
import { buildObservabilityTraceDetail } from './observability-trace.mapper';

@Injectable()
export class GetObservabilityTraceUseCase {
  constructor(
    private readonly repository: ObservabilityEventRepository,
    private readonly generations: ObservabilityGenerationRepository,
  ) {}

  async execute(traceId: string): Promise<ObservabilityTraceDetail> {
    const events = await this.repository.findByTraceId(traceId);
    const detail = buildObservabilityTraceDetail(traceId, events);

    if (!detail) {
      throw new ApplicationError('not_found', '执行链路不存在。');
    }

    return {
      ...detail,
      generations: await this.generations.findByTraceId(traceId),
    };
  }
}
