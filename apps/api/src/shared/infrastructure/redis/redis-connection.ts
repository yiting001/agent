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

  isConfigured(): boolean {
    return Boolean(this.client);
  }

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

  async ping(): Promise<'disabled' | 'ok'> {
    if (!this.client) {
      return 'disabled';
    }

    await this.ensureConnected();
    await this.client.ping();

    return 'ok';
  }

  private async ensureConnected(): Promise<void> {
    if (this.client && !this.client.isOpen) {
      await this.client.connect();
    }
  }
}
