import { BadRequestException } from '@nestjs/common';

export function requireMemoryOwnerKey(ownerKey?: string): string {
  if (!ownerKey || ownerKey.length > 80) {
    throw new BadRequestException('ownerKey 必填且不能超过 80 个字符。');
  }

  return ownerKey;
}
