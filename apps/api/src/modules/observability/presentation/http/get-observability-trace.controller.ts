import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { GetObservabilityTraceUseCase } from '../../application/get-observability-trace.use-case';
import type { ObservabilityTraceDetail } from '../../domain/observability-event';

@ApiTags('observability')
@Controller('observability/traces')
export class GetObservabilityTraceController {
  constructor(private readonly getTrace: GetObservabilityTraceUseCase) {}

  @Get(':traceId')
  @ApiOperation({ summary: 'Return the complete span chain for a trace' })
  execute(
    @Param('traceId') traceId: string,
  ): Promise<ObservabilityTraceDetail> {
    return this.getTrace.execute(traceId);
  }
}
