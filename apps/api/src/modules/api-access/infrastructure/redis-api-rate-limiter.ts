import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import { RedisConnection } from '../../../shared/infrastructure/redis/redis-connection';
import {
  ApiRateLimiter,
  type ApiRateLimitPolicy,
  type ApiRateLimitKind,
} from '../application/api-rate-limiter';

interface LocalWindow {
  count: number;
  expiresAt: number;
}

@Injectable()
export class RedisApiRateLimiter extends ApiRateLimiter {
  private readonly localWindows = new Map<string, LocalWindow>();
  private readonly prefix: string;

  constructor(
    configService: ConfigService,
    private readonly redis: RedisConnection,
  ) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.prefix = config.redisKeyPrefix;
  }

  async consume(input: {
    identifier: string;
    kind: ApiRateLimitKind;
    policy: ApiRateLimitPolicy;
  }): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const key = this.key(input.kind, input.identifier);

    if (!this.redis.isConfigured()) {
      return this.consumeLocal(key, input.policy);
    }

    try {
      const window = await this.redis.consumeWindow(key, input.policy.windowMs);

      return {
        allowed: window.count <= input.policy.maxRequests,
        retryAfterMs: window.ttlMs,
      };
    } catch {
      throw new ApplicationError(
        'service_unavailable',
        '请求限流服务暂时不可用。',
      );
    }
  }

  private consumeLocal(
    key: string,
    policy: ApiRateLimitPolicy,
  ): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const existing = this.localWindows.get(key);
    const window =
      existing && existing.expiresAt > now
        ? existing
        : { count: 0, expiresAt: now + policy.windowMs };

    window.count += 1;
    this.localWindows.set(key, window);

    return {
      allowed: window.count <= policy.maxRequests,
      retryAfterMs: window.expiresAt - now,
    };
  }

  private key(kind: ApiRateLimitKind, identifier: string): string {
    const identifierHash = createHash('sha256')
      .update(identifier)
      .digest('hex');

    return `${this.prefix}:rate-limit:${kind}:${identifierHash}`;
  }
}
