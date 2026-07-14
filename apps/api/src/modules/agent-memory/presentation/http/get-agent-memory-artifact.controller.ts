import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { ApplicationError } from '../../../../shared/application/application-error';
import { AgentMemoryManagementService } from '../../application/agent-memory-management.service';
import { requireMemoryOwnerKey } from './memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memories/:memoryId/artifacts/:artifactId')
export class GetAgentMemoryArtifactController {
  constructor(private readonly memory: AgentMemoryManagementService) {}

  @Get()
  @ApiOperation({ summary: '读取 owner 范围内的情景记忆原始图片' })
  async execute(
    @Param('agentId') agentId: string,
    @Param('memoryId') memoryId: string,
    @Param('artifactId') artifactId: string,
    @Query('ownerKey') ownerKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.memory.readArtifact(
      agentId,
      requireMemoryOwnerKey(ownerKey),
      memoryId,
      artifactId,
    );

    if (!artifact) {
      throw new ApplicationError('not_found', '情景记忆图片不存在。');
    }

    response.setHeader('Content-Type', artifact.mimeType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(artifact.fileName)}`,
    );

    return new StreamableFile(artifact.content);
  }
}
