import { Module } from '@nestjs/common';

import { MemoryOwnerIdentity } from './application/memory-owner-identity';
import { HmacMemoryOwnerIdentity } from './infrastructure/hmac-memory-owner-identity';
import { CreateMemoryOwnerTokenController } from './presentation/http/create-memory-owner-token.controller';

@Module({
  controllers: [CreateMemoryOwnerTokenController],
  exports: [MemoryOwnerIdentity],
  providers: [
    {
      provide: MemoryOwnerIdentity,
      useClass: HmacMemoryOwnerIdentity,
    },
  ],
})
export class MemoryOwnerIdentityModule {}
