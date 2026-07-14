import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';
import type {
  ChatCompletionInput,
  EmbeddingInput,
} from '../src/modules/model-providers/application/model-gateway';
import { ModelGateway } from '../src/modules/model-providers/application/model-gateway';
import { ApplicationErrorFilter } from '../src/shared/presentation/application-error.filter';

function readStringProperty(value: unknown, property: string): string {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Expected ${property} to be a string.`);
  }

  const result = (value as Record<string, unknown>)[property];

  if (typeof result !== 'string') {
    throw new Error(`Expected ${property} to be a string.`);
  }

  return result;
}

describe('Agent memory', () => {
  let agentId = '';
  let app: INestApplication<Server>;
  const chatInputs: ChatCompletionInput[] = [];
  const ownerKey = 'owner-memory-e2e';
  let providerId = '';

  beforeAll(async () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '44'.repeat(32);
    process.env.DATABASE_MIGRATIONS_RUN = 'false';
    process.env.DATABASE_PATH = ':memory:';
    process.env.DATABASE_SYNCHRONIZE = 'true';
    process.env.INGESTION_POLL_INTERVAL_MS = '60000';

    const modelGateway = {
      chat: jest.fn().mockResolvedValue('记忆回答'),
      chatWithTools: jest.fn().mockResolvedValue({
        content: '记忆回答',
        toolCalls: [],
      } satisfies Awaited<ReturnType<ModelGateway['chatWithTools']>>),
      embed: jest
        .fn()
        .mockImplementation((input: EmbeddingInput) =>
          Promise.resolve(input.input.map(() => [0.1, 0.2, 0.3])),
        ),
      streamChat: jest.fn().mockImplementation(async function* (
        input: ChatCompletionInput,
      ) {
        chatInputs.push(input);
        await Promise.resolve();
        yield '记忆回答';
      }),
      verify: jest.fn().mockResolvedValue(undefined),
    };
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ModelGateway)
      .useValue(modelGateway)
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

    const providerResponse = await request(app.getHttpServer())
      .put('/api/model-providers/memory-e2e-provider')
      .send({
        apiKey: 'memory-e2e-key',
        baseUrl: 'https://model.test/v1',
        chatModel: 'memory-model',
        description: '记忆 E2E 模型',
        embeddingDimensions: 3,
        embeddingModel: 'embedding-model',
        name: '记忆模型',
      })
      .expect(200);
    const providerBody: unknown = providerResponse.body;

    providerId = readStringProperty(providerBody, 'id');

    const agentResponse = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        description: '验证长短期记忆',
        moduleIds: [],
        name: '记忆测试智能体',
        providerId,
        skillIds: [],
        systemPrompt: '请依据上下文回答。',
        temperature: 0.2,
      })
      .expect(201);

    const agentBody: unknown = agentResponse.body;

    agentId = readStringProperty(agentBody, 'id');
  });

  afterAll(async () => {
    await app.close();
  });

  it('persists, recalls, deletes and clears owner-scoped memory', async () => {
    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        conversationId: 'conversation-a',
        memoryOwnerKey: ownerKey,
        messages: [{ content: '请记住：我喜欢中文回答', role: 'user' }],
        stream: false,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            answer: '记忆回答',
            conversationId: 'conversation-a',
          }),
        );
      });

    const memories = await request(app.getHttpServer())
      .get(`/api/agents/${agentId}/memories`)
      .query({ ownerKey })
      .expect(200);

    const memoryBody: unknown = memories.body;

    expect(memoryBody).toEqual([
      expect.objectContaining({
        content: '用户偏好：中文回答。',
        type: 'preference',
      }),
    ]);

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        conversationId: 'conversation-b',
        memoryOwnerKey: ownerKey,
        messages: [{ content: '我喜欢怎样的回答？', role: 'user' }],
        stream: false,
      })
      .expect(200);

    expect(chatInputs.at(-1)?.messages[0]?.content).toContain(
      '用户偏好：中文回答。',
    );

    if (!Array.isArray(memoryBody) || memoryBody.length === 0) {
      throw new Error('Expected at least one memory.');
    }

    const memoryId = readStringProperty(memoryBody[0], 'id');

    await request(app.getHttpServer())
      .delete(`/api/agents/${agentId}/memories/${memoryId}`)
      .query({ ownerKey })
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/agents/${agentId}/memories`)
      .query({ ownerKey })
      .expect(200, []);

    await request(app.getHttpServer())
      .delete(`/api/agents/${agentId}/memories`)
      .query({ ownerKey })
      .expect(204);
  });
});
