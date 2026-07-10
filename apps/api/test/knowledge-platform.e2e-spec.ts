import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { promises as fileSystem } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { DocumentTextExtractor } from '../src/modules/knowledge/application/document-text-extractor';
import { VectorIndex } from '../src/modules/knowledge/application/vector-index';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';
import type { EmbeddingInput } from '../src/modules/model-providers/application/model-gateway';
import { ModelGateway } from '../src/modules/model-providers/application/model-gateway';
import { ApplicationErrorFilter } from '../src/shared/presentation/application-error.filter';

function parseRecord(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Expected an object response.');
  }

  return parsed as Record<string, unknown>;
}

function readString(value: Record<string, unknown>, property: string): string {
  const result = value[property];

  if (typeof result !== 'string') {
    throw new Error(`Expected ${property} to be a string.`);
  }

  return result;
}

function readArray(
  value: Record<string, unknown>,
  property: string,
): unknown[] {
  const result = value[property];

  if (!Array.isArray(result)) {
    throw new Error(`Expected ${property} to be an array.`);
  }

  return result;
}

describe('Knowledge platform', () => {
  const storagePath = resolve('.test-data/knowledge-platform');
  let app: INestApplication<Server>;

  beforeAll(async () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '22'.repeat(32);
    process.env.DATABASE_MIGRATIONS_RUN = 'false';
    process.env.DATABASE_PATH = ':memory:';
    process.env.DATABASE_SYNCHRONIZE = 'true';
    process.env.INGESTION_POLL_INTERVAL_MS = '60000';
    process.env.KNOWLEDGE_STORAGE_PATH = storagePath;
    process.env.KNOWLEDGE_UPLOAD_CHUNK_BYTES = '8';

    await fileSystem.rm(storagePath, { force: true, recursive: true });

    const modelGateway = {
      chat: jest.fn().mockResolvedValue('真实模型回答'),
      embed: jest
        .fn()
        .mockImplementation((input: EmbeddingInput) =>
          Promise.resolve(input.input.map(() => [0.1, 0.2, 0.3])),
        ),
      verify: jest.fn().mockResolvedValue(undefined),
    };
    const vectorIndex = {
      ensureCollection: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([
        {
          content: '企业知识片段',
          documentId: 'document-id',
          fileName: '资料.txt',
          moduleId: 'module-id',
          score: 0.95,
        },
      ]),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    const textExtractor = {
      extract: jest.fn().mockResolvedValue('企业知识片段'),
    };
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ModelGateway)
      .useValue(modelGateway)
      .overrideProvider(VectorIndex)
      .useValue(vectorIndex)
      .overrideProvider(DocumentTextExtractor)
      .useValue(textExtractor)
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

  it('persists shared knowledge, agents, credentials and chunked uploads', async () => {
    const providerResponse = await request(app.getHttpServer())
      .put('/api/model-providers/test-provider')
      .send({
        apiKey: 'test-key',
        baseUrl: 'http://model.test/v1',
        chatModel: 'chat-model',
        description: '测试模型服务',
        embeddingDimensions: 3,
        embeddingModel: 'embedding-model',
        name: '测试模型',
      })
      .expect(200);
    const providerId = readString(parseRecord(providerResponse.text), 'id');
    const providersResponse = await request(app.getHttpServer())
      .get('/api/model-providers')
      .expect(200);

    expect(providersResponse.text).not.toContain('test-key');

    const baseResponse = await request(app.getHttpServer())
      .post('/api/knowledge-bases')
      .send({
        description: '企业共享知识',
        embeddingProviderId: providerId,
        name: '企业知识库',
      })
      .expect(201);
    const knowledgeBase = parseRecord(baseResponse.text);
    const knowledgeBaseId = readString(knowledgeBase, 'id');
    const modules = readArray(knowledgeBase, 'modules');
    const defaultModule = modules[0];

    if (
      typeof defaultModule !== 'object' ||
      defaultModule === null ||
      Array.isArray(defaultModule)
    ) {
      throw new Error('Expected a default knowledge module.');
    }

    const defaultModuleId = readString(
      defaultModule as Record<string, unknown>,
      'id',
    );
    const moduleResponse = await request(app.getHttpServer())
      .post(`/api/knowledge-bases/${knowledgeBaseId}/modules`)
      .send({
        description: '多个智能体可共同使用',
        name: '共享政策',
      })
      .expect(201);
    const sharedModuleId = readString(parseRecord(moduleResponse.text), 'id');

    const agentResponse = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        description: '回答企业知识问题',
        moduleIds: [defaultModuleId, sharedModuleId],
        name: '企业助手',
        providerId,
        systemPrompt: '请依据企业知识回答。',
        temperature: 0.2,
      })
      .expect(201);
    const agentId = readString(parseRecord(agentResponse.text), 'id');

    await request(app.getHttpServer())
      .patch(`/api/agents/${agentId}/status`)
      .send({ status: 'published' })
      .expect(200);

    const applicationResponse = await request(app.getHttpServer())
      .post('/api/api-applications')
      .send({ agentId, name: '官网接入' })
      .expect(201);
    const application = parseRecord(applicationResponse.text);
    const secretKey = readString(application, 'secretKey');

    const listedApplications = await request(app.getHttpServer())
      .get('/api/api-applications')
      .expect(200);

    expect(listedApplications.text).not.toContain(secretKey);

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        messages: [{ content: '企业知识是什么？', role: 'user' }],
      })
      .expect(201)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'answer')).toBe('真实模型回答');
      });

    await request(app.getHttpServer())
      .post(`/api/public/agents/${agentId}/chat`)
      .send({
        messages: [{ content: '公开测试问题', role: 'user' }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/chat/completions')
      .set('Authorization', `Bearer ${secretKey}`)
      .send({
        messages: [{ content: '请回答问题', role: 'user' }],
        model: 'agent',
      })
      .expect(201)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'object')).toBe('chat.completion');
      });

    const document = Buffer.from('需要进入异步索引的真实文档内容。');
    const uploadResponse = await request(app.getHttpServer())
      .post(`/api/knowledge-modules/${sharedModuleId}/uploads`)
      .send({
        fileName: '资料.txt',
        mimeType: 'text/plain',
        totalBytes: document.length,
      })
      .expect(201);
    const uploadId = readString(parseRecord(uploadResponse.text), 'id');
    const parts = Array.from(
      { length: Math.ceil(document.length / 8) },
      (_, index) => document.subarray(index * 8, (index + 1) * 8),
    );
    const uploadPart = async (partNumber: number): Promise<void> => {
      const part = parts[partNumber - 1];

      if (!part) {
        throw new Error('Expected upload part.');
      }

      await request(app.getHttpServer())
        .put(`/api/uploads/${uploadId}/parts/${partNumber}`)
        .set('Content-Length', String(part.length))
        .set('Content-Type', 'application/octet-stream')
        .send(part)
        .expect(200);
    };

    await uploadPart(2);
    await uploadPart(1);
    await uploadPart(2);

    for (let partNumber = 3; partNumber <= parts.length; partNumber += 1) {
      await uploadPart(partNumber);
    }

    await request(app.getHttpServer())
      .get(`/api/uploads/${uploadId}`)
      .expect(200)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'status')).toBe('open');
      });

    await request(app.getHttpServer())
      .post(`/api/uploads/${uploadId}/complete`)
      .send({})
      .expect(201)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'status')).toBe('queued');
      });
  });
});
