import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { GetObservabilityDashboardUseCase } from '../../application/get-observability-dashboard.use-case';
import type { ObservabilityDashboard } from '../../domain/observability-event';
import { GetObservabilityDashboardDto } from './get-observability-dashboard.dto';

@ApiTags('observability')
@Controller('observability')
export class GetObservabilityDashboardController {
  constructor(
    private readonly getDashboard: GetObservabilityDashboardUseCase,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Return operational telemetry and recent alerts' })
  execute(
    @Query() query: GetObservabilityDashboardDto,
  ): Promise<ObservabilityDashboard> {
    return this.getDashboard.execute(query.hours ?? 24);
  }
}
