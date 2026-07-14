import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

import type { ApplicationConfig } from '../../../config/application.config';

type RedisClient = ReturnType<typeof createClient>;

/** Redis 单连接适配器，仅提供 readiness 和原子固定窗口能力。 */
@Injectable()
export class RedisConnection
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly client?: RedisClient;
  private readonly logger = new Logger(RedisConnection.name);

  constructor(configService: ConfigService) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    if (config.redisUrl) {
      this.client = createClient({
        disableOfflineQueue: true,
        socket: {
          reconnectStrategy: false,
        },
        url: config.redisUrl,
      });
      this.client.on('error', () => {
        this.logger.error('Redis 连接发生错误。');
      });
    }
  }

  /** 判断 Redis 是否配置，不代表当前连接健康。 */
  isConfigured(): boolean {
    return Boolean(this.client);
  }

  /** 通过 Lua 原子递增计数并在首次请求设置窗口 TTL。 */
  async consumeWindow(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; ttlMs: number }> {
    if (!this.client) {
      throw new Error('Redis 未配置。');
    }

    await this.ensureConnected();
    const result: unknown = await this.client.eval(
      `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then
          redis.call('PEXPIRE', KEYS[1], ARGV[1])
        end
        return {count, redis.call('PTTL', KEYS[1])}
      `,
      {
        arguments: [String(windowMs)],
        keys: [key],
      },
    );

    if (
      !Array.isArray(result) ||
      result.length !== 2 ||
      typeof result[0] !== 'number' ||
      typeof result[1] !== 'number'
    ) {
      throw new Error('Redis 限流脚本返回了无效结果。');
    }

    return { count: result[0], ttlMs: Math.max(0, result[1]) };
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensureConnected();
    } catch {
      this.logger.error('Redis 启动连接失败。');
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client?.isOpen) {
      try {
        await this.client.quit();
      } catch {
        this.client.destroy();
      }
    }
  }

  /** 未配置返回 disabled；已配置时执行真实 PING。 */
  async ping(): Promise<'disabled' | 'ok'> {
    if (!this.client) {
      return 'disabled';
    }

    await this.ensureConnected();
    await this.client.ping();

    return 'ok';
  }

  /** 禁用离线队列和自动重连，故障由上层明确处理。 */
  private async ensureConnected(): Promise<void> {
    if (this.client && !this.client.isOpen) {
      await this.client.connect();
    }
  }
}
