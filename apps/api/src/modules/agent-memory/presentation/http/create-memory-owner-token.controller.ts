import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { MemoryOwnerIdentity } from '../../application/memory-owner-identity';

interface MemoryOwnerTokenResponse {
  token: string;
}

@ApiTags('agent-memory')
@Controller('memory-owner-tokens')
export class CreateMemoryOwnerTokenController {
  constructor(private readonly identity: MemoryOwnerIdentity) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: '签发匿名记忆主体凭证' })
  execute(): MemoryOwnerTokenResponse {
    return { token: this.identity.issue() };
  }
}
