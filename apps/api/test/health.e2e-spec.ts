import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import type { HealthStatus } from '../src/modules/health/domain/health-status';

function isHealthStatus(value: unknown): value is HealthStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.service === 'string' &&
    candidate.status === 'ok' &&
    typeof candidate.timestamp === 'string'
  );
}

describe('Health endpoint', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.API_SERVICE_NAME = 'agent-api-test';

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication<INestApplication<Server>>();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the configured service health', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    const responseBody: unknown = JSON.parse(response.text);

    expect(isHealthStatus(responseBody)).toBe(true);

    if (!isHealthStatus(responseBody)) {
      throw new Error('Health response did not match its public contract.');
    }

    expect(responseBody.service).toBe('agent-api-test');
    expect(responseBody.status).toBe('ok');
    expect(Number.isNaN(Date.parse(responseBody.timestamp))).toBe(false);
  });
});
