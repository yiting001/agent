import { BadRequestException } from '@nestjs/common';

/**
 * 校验客户端提供的记忆隔离键。
 * ownerKey 当前不是可信身份，调用方仍需在认证层绑定真实主体。
 */
export function requireMemoryOwnerKey(ownerKey?: string): string {
  if (!ownerKey || ownerKey.length > 80) {
    throw new BadRequestException('ownerKey 必填且不能超过 80 个字符。');
  }

  return ownerKey;
}
