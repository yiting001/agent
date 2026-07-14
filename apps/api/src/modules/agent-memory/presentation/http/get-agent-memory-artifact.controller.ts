import {
  Controller,
  Get,
  Headers,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { ApplicationError } from '../../../../shared/application/application-error';
import { AgentMemoryManagementService } from '../../application/agent-memory-management.service';
import { MemoryOwnerIdentity } from '../../application/memory-owner-identity';
import {
  ApiMemoryOwnerToken,
  resolveRequiredMemoryOwnerKey,
} from './resolve-memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memories/:memoryId/artifacts/:artifactId')
export class GetAgentMemoryArtifactController {
  constructor(
    private readonly memory: AgentMemoryManagementService,
    private readonly identity: MemoryOwnerIdentity,
  ) {}

  @Get()
  @ApiMemoryOwnerToken()
  @ApiOperation({ summary: '读取 owner 范围内的情景记忆原始图片' })
  async execute(
    @Param('agentId') agentId: string,
    @Param('memoryId') memoryId: string,
    @Param('artifactId') artifactId: string,
    @Headers('x-memory-owner-token') ownerToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.memory.readArtifact(
      agentId,
      resolveRequiredMemoryOwnerKey(ownerToken, this.identity),
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
