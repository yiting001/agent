import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { GetHealthStatusUseCase } from '../../application/use-cases/get-health-status.use-case';
import type { HealthStatus } from '../../domain/health-status';

@ApiTags('health')
@Controller('health')
export class GetHealthController {
  constructor(private readonly getHealthStatus: GetHealthStatusUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Return the current API health status' })
  @ApiOkResponse({
    schema: {
      example: {
        service: 'agent-api',
        status: 'ok',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  getHealth(): HealthStatus {
    return this.getHealthStatus.execute();
  }
}
