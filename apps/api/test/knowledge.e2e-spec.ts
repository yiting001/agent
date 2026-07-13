import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import type { KnowledgeEntry } from '../src/modules/knowledge/domain/knowledge-entry';

const draft = {
  content: '领域层不得依赖 NestJS、TypeORM 或 HTTP。',
  tags: ['架构', '规范'],
  title: 'DDD 分层约定',
};

describe('Knowledge entry endpoints', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.DATABASE_SYNCHRONIZE = 'true';

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication<INestApplication<Server>>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports the full create, read, update and delete flow', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/knowledge-entries')
      .send(draft)
      .expect(201);
    const created = createResponse.body as KnowledgeEntry;

    expect(created.id).toBeTruthy();
    expect(created.title).toBe(draft.title);
    expect(created.tags).toEqual(draft.tags);

    const listResponse = await request(app.getHttpServer())
      .get('/api/knowledge-entries')
      .expect(200);

    expect(listResponse.body).toEqual([created]);

    await request(app.getHttpServer())
      .get(`/api/knowledge-entries/${created.id}`)
      .expect(200);

    const updateResponse = await request(app.getHttpServer())
      .put(`/api/knowledge-entries/${created.id}`)
      .send({ title: '更新后的标题' })
      .expect(200);
    const updated = updateResponse.body as KnowledgeEntry;

    expect(updated.title).toBe('更新后的标题');
    expect(updated.content).toBe(draft.content);

    await request(app.getHttpServer())
      .delete(`/api/knowledge-entries/${created.id}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/knowledge-entries/${created.id}`)
      .expect(404);
  });

  it('rejects payloads that violate the entry contract', async () => {
    await request(app.getHttpServer())
      .post('/api/knowledge-entries')
      .send({ content: '', tags: [], title: '' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/knowledge-entries')
      .send({ ...draft, unexpected: true })
      .expect(400);
  });

  it('returns 404 for operations on unknown entries', async () => {
    await request(app.getHttpServer())
      .get('/api/knowledge-entries/unknown-id')
      .expect(404);
    await request(app.getHttpServer())
      .put('/api/knowledge-entries/unknown-id')
      .send({ title: '任意标题' })
      .expect(404);
    await request(app.getHttpServer())
      .delete('/api/knowledge-entries/unknown-id')
      .expect(404);
  });
});
