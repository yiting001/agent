import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { promises as fileSystem } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';
import { ApplicationErrorFilter } from '../src/shared/presentation/application-error.filter';

describe('Branding settings', () => {
  const storagePath = resolve('.test-data/branding');
  let app: INestApplication<Server>;

  beforeAll(async () => {
    process.env.BRAND_ICON_MAX_BYTES = '1024';
    process.env.BRAND_STORAGE_PATH = storagePath;
    process.env.DATABASE_MIGRATIONS_RUN = 'false';
    process.env.DATABASE_SYNCHRONIZE = 'true';
    process.env.DEFAULT_SOFTWARE_NAME = '初始智能体';

    await fileSystem.rm(storagePath, { force: true, recursive: true });

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IngestionScheduler)
      .useValue({
        onApplicationBootstrap: () => undefined,
        onApplicationShutdown: () => undefined,
      })
      .compile();

    app = testingModule.createNestApplication<INestApplication<Server>>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    app.useGlobalFilters(new ApplicationErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await fileSystem.rm(storagePath, { force: true, recursive: true });
  });

  it('persists the software name and custom icon', async () => {
    await request(app.getHttpServer()).get('/api/branding').expect(200, {
      hasCustomIcon: false,
      softwareName: '初始智能体',
      updatedAt: '1970-01-01T00:00:00.000Z',
    });

    await request(app.getHttpServer())
      .put('/api/branding')
      .send({ softwareName: '企业智能中枢' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            hasCustomIcon: false,
            softwareName: '企业智能中枢',
          }),
        );
      });

    const icon = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await request(app.getHttpServer())
      .put('/api/branding/icon')
      .set('Content-Type', 'image/png')
      .send(Buffer.from('not-an-image'))
      .expect(422);

    await request(app.getHttpServer())
      .put('/api/branding/icon')
      .set('Content-Type', 'image/png')
      .send(icon)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            hasCustomIcon: true,
            softwareName: '企业智能中枢',
          }),
        );
      });

    const iconResponse = await request(app.getHttpServer())
      .get('/api/branding/icon')
      .expect('Content-Type', /image\/png/)
      .expect(200);

    expect(iconResponse.body).toEqual(icon);

    await request(app.getHttpServer())
      .delete('/api/branding/icon')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            hasCustomIcon: false,
            softwareName: '企业智能中枢',
          }),
        );
      });
    await request(app.getHttpServer()).get('/api/branding/icon').expect(404);
  });
});
