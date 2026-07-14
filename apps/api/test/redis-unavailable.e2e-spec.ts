import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import type { Response } from 'supertest';

import { AppModule } from '../src/app.module';
import { AgentMemoryTaskScheduler } from '../src/modules/agent-memory/infrastructure/agent-memory-task.scheduler';
import { EnforceApiRateLimitService } from '../src/modules/api-access/application/enforce-api-rate-limit.service';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';

describe('Unavailable Redis', () => {
  let app: INestApplication<Server>;
  let rateLimit: EnforceApiRateLimitService;

  beforeAll(async () => {
    process.env.DATABASE_MIGRATIONS_RUN = 'true';
    process.env.DATABASE_SYNCHRONIZE = 'false';
    process.env.REDIS_URL = 'redis://127.0.0.1:6399';

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
    delete process.env.REDIS_URL;
  });

  it('starts but reports not ready', async () => {
    await request(app.getHttpServer())
      .get('/api/health/readiness')
      .expect(503)
      .expect((response: Response) => {
        const body: unknown = response.body;

        expect(body).toMatchObject({
          dependencies: {
            database: 'ok',
            pgvector: 'ok',
            redis: 'unavailable',
          },
          status: 'not_ready',
        });
      });
  });

  it('fails closed for high-cost API entry points', async () => {
    await expect(
      rateLimit.execute({
        identifier: 'application-id',
        kind: 'application',
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'service_unavailable' }));
  });
});
