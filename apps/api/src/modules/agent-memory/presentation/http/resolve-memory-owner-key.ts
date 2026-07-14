import { BadRequestException } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

import { MemoryOwnerIdentity } from '../../application/memory-owner-identity';

/** 在 OpenAPI 中声明匿名记忆主体 bearer token。 */
export function ApiMemoryOwnerToken(): MethodDecorator & ClassDecorator {
  return ApiHeader({
    description: '由 POST /api/memory-owner-tokens 签发的匿名 bearer token',
    name: 'X-Memory-Owner-Token',
    required: true,
  });
}

/** 校验匿名 bearer token，并返回服务端派生的稳定记忆隔离键。 */
export function resolveRequiredMemoryOwnerKey(
  ownerToken: string | undefined,
  identity: MemoryOwnerIdentity,
): string {
  if (!ownerToken || ownerToken.length > 160) {
    throw new BadRequestException('X-Memory-Owner-Token 请求头无效。');
  }

  return identity.resolve(ownerToken);
}
