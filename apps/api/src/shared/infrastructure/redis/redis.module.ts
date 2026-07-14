import { Global, Module } from '@nestjs/common';

import { RedisConnection } from './redis-connection';

@Global()
@Module({
  exports: [RedisConnection],
  providers: [RedisConnection],
})
export class RedisModule {}
