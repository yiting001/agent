import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ListObservabilityTracesUseCase } from '../../application/list-observability-traces.use-case';
import type { ObservabilityTracePage } from '../../domain/observability-event';
import { ListObservabilityTracesDto } from './list-observability-traces.dto';

@ApiTags('observability')
@Controller('observability/traces')
export class ListObservabilityTracesController {
  constructor(private readonly listTraces: ListObservabilityTracesUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List paginated recent execution traces' })
  execute(
    @Query() query: ListObservabilityTracesDto,
  ): Promise<ObservabilityTracePage> {
    return this.listTraces.execute(
      query.hours ?? 24,
      query.page ?? 1,
      query.pageSize ?? 10,
      query.cursorStartedAt,
      query.cursorTraceId,
    );
  }
}
