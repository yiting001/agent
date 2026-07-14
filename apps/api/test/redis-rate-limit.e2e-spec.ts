import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { ApplicationError } from '../src/shared/application/application-error';
import { AgentMemoryTaskScheduler } from '../src/modules/agent-memory/infrastructure/agent-memory-task.scheduler';
import { EnforceApiRateLimitService } from '../src/modules/api-access/application/enforce-api-rate-limit.service';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';

describe('Redis API rate limit', () => {
  let app: INestApplication<Server>;
  let rateLimit: EnforceApiRateLimitService;

  beforeAll(async () => {
    process.env.API_RATE_LIMIT_MAX = '2';
    process.env.DATABASE_MIGRATIONS_RUN = 'true';
    process.env.DATABASE_SYNCHRONIZE = 'false';
    process.env.REDIS_KEY_PREFIX = `agent-test-${Date.now()}`;
    process.env.REDIS_URL =
      process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:6379';

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IngestionScheduler)
      .useValue({
        onApplicationBootstrap: () => undefined,
        onApplicationShutdown: () => undefined,
      })
      .overrideProvider(AgentMemoryTaskScheduler)
      .useValue({
        dispatch: () => undefined,
        onApplicationBootstrap: () => undefined,
        onApplicationShutdown: () => undefined,
      })
      .compile();

    app = testingModule.createNestApplication<INestApplication<Server>>();
    app.setGlobalPrefix('api');
    await app.init();
    rateLimit = app.get(EnforceApiRateLimitService);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.API_RATE_LIMIT_MAX;
    delete process.env.REDIS_KEY_PREFIX;
    delete process.env.REDIS_URL;
  });

  it('enforces a distributed fixed-window quota', async () => {
    const input = {
      identifier: 'application-id',
      kind: 'application' as const,
    };

    await expect(rateLimit.execute(input)).resolves.toBeUndefined();
    await expect(rateLimit.execute(input)).resolves.toBeUndefined();

    try {
      await rateLimit.execute(input);
      throw new Error('Expected the third request to be rate limited.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe('too_many_requests');
    }
  });

  it('reports PostgreSQL, pgvector and Redis readiness', async () => {
    await request(app.getHttpServer())
      .get('/api/health/readiness')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            dependencies: {
              database: 'ok',
              pgvector: 'ok',
              redis: 'ok',
            },
            status: 'ready',
          }),
        );
      });
  });
});
