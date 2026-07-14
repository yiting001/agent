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

/**
 * Redis 可用时提供跨实例固定窗口限流；未配置 Redis 时仅为开发环境
 * 使用进程内窗口。Redis 已配置但故障时采用 fail-closed。
 */
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

  /** 消费一次窗口配额，并返回允许状态和剩余等待时间。 */
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

  /** 单进程开发降级实现，不提供多实例一致性。 */
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

  /** 对调用方标识做摘要，避免 IP、应用标识等原值进入 Redis 键。 */
  private key(kind: ApiRateLimitKind, identifier: string): string {
    const identifierHash = createHash('sha256')
      .update(identifier)
      .digest('hex');

    return `${this.prefix}:rate-limit:${kind}:${identifierHash}`;
  }
}
