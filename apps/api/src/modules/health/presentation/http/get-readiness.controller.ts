import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { GetReadinessStatusUseCase } from '../../application/use-cases/get-readiness-status.use-case';
import type { ReadinessStatus } from '../../domain/readiness-status';

@ApiTags('health')
@Controller('health/readiness')
export class GetReadinessController {
  constructor(private readonly getReadiness: GetReadinessStatusUseCase) {}

  @Get()
  @ApiOperation({ summary: '检查 PostgreSQL、pgvector 与 Redis 就绪状态' })
  async getHealth(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReadinessStatus> {
    const status = await this.getReadiness.execute();

    response.status(status.status === 'ready' ? 200 : 503);

    return status;
  }
}
