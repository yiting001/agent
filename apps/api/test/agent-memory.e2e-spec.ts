import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AgentMemoryIndex } from '../src/modules/agent-memory/application/agent-memory.index';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';
import type {
  ChatCompletionInput,
  EmbeddingInput,
} from '../src/modules/model-providers/application/model-gateway';
import { ModelGateway } from '../src/modules/model-providers/application/model-gateway';
import { ApplicationErrorFilter } from '../src/shared/presentation/application-error.filter';
import { createInMemoryAgentMemoryIndex } from './in-memory-agent-memory.index';
import { issueMemoryOwner } from './agent-memory-test-helpers';
import { readStringProperty } from './read-value';

describe('Agent memory', () => {
  let agentId = '';
  let otherAgentId = '';
  let app: INestApplication<Server>;
  const chatInputs: ChatCompletionInput[] = [];
  let otherOwnerToken = '';
  let ownerToken = '';
  let providerId = '';

  beforeAll(async () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '44'.repeat(32);
    process.env.DATABASE_MIGRATIONS_RUN = 'false';
    process.env.DATABASE_SYNCHRONIZE = 'true';
    process.env.AGENT_MEMORY_TASK_BACKOFF_BASE_MS = '1';
    process.env.AGENT_MEMORY_TASK_MAX_ATTEMPTS = '2';
    process.env.AGENT_MEMORY_TASK_POLL_INTERVAL_MS = '60000';
    process.env.INGESTION_POLL_INTERVAL_MS = '60000';

    const modelGateway = {
      chat: jest.fn().mockImplementation((input: ChatCompletionInput) => {
        const messages = JSON.stringify(input.messages);

        if (
          messages.includes('触发视觉失败') &&
          messages.includes('情景记忆提取器')
        ) {
          return Promise.reject(new Error('vision unavailable'));
        }

        return Promise.resolve(
          JSON.stringify({
            entities: ['狗', '柯基', '公园'],
            importance: 3,
            summary: '用户曾分享一张在公园拍到的柯基犬图片。',
          }),
        );
      }),
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
    const memoryIndex = createInMemoryAgentMemoryIndex();
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ModelGateway)
      .useValue(modelGateway)
      .overrideProvider(AgentMemoryIndex)
      .useValue(memoryIndex)
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
    ({ ownerToken } = await issueMemoryOwner(app));
    ({ ownerToken: otherOwnerToken } = await issueMemoryOwner(app));

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
    const otherAgentResponse = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        description: '验证图片情景隔离',
        moduleIds: [],
        name: '另一记忆测试智能体',
        providerId,
        skillIds: [],
        systemPrompt: '请依据上下文回答。',
        temperature: 0.2,
      })
      .expect(201);

    otherAgentId = readStringProperty(otherAgentResponse.body, 'id');
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unsigned owner keys and tampered owner tokens', async () => {
    const [version, subject] = ownerToken.split('.');

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        memoryOwnerKey: 'forged-owner',
        messages: [{ content: '伪造 owner', role: 'user' }],
        stream: false,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        memoryOwnerToken: `${version}.${subject}.invalid`,
        messages: [{ content: '篡改 token', role: 'user' }],
        stream: false,
      })
      .expect(401);
  });

  it('persists, recalls, deletes and clears owner-scoped memory', async () => {
    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        conversationId: 'conversation-a',
        memoryOwnerToken: ownerToken,
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
      .set('X-Memory-Owner-Token', ownerToken)
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
        memoryOwnerToken: ownerToken,
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
      .set('X-Memory-Owner-Token', ownerToken)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/agents/${agentId}/memories`)
      .set('X-Memory-Owner-Token', ownerToken)
      .expect(200, []);

    await request(app.getHttpServer())
      .delete(`/api/agents/${agentId}/memories`)
      .set('X-Memory-Owner-Token', ownerToken)
      .expect(204);
  });

  it('records and recalls owner-scoped image episodes with original evidence', async () => {
    const image = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    const upload = await request(app.getHttpServer())
      .post('/api/chat-attachments')
      .set('Content-Type', 'image/png')
      .set('Content-Length', String(image.length))
      .set('X-Agent-Id', agentId)
      .set('X-File-Name', encodeURIComponent('park-dog.png'))
      .set('X-Memory-Owner-Token', ownerToken)
      .send(image)
      .expect(201);
    const attachment: unknown = upload.body;

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        conversationId: 'conversation-image-a',
        memoryOwnerToken: ownerToken,
        messages: [
          {
            attachments: [attachment],
            content: '这是我在公园看到的小狗。',
            role: 'user',
          },
        ],
        stream: false,
      })
      .expect(200);

    let episodeBody: unknown[] = [];

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await request(app.getHttpServer())
        .get(`/api/agents/${agentId}/memories`)
        .set('X-Memory-Owner-Token', ownerToken)
        .expect(200);

      if (Array.isArray(response.body)) {
        episodeBody = response.body as unknown[];
      }

      if (
        episodeBody.some(
          (memory) =>
            typeof memory === 'object' &&
            memory !== null &&
            'type' in memory &&
            memory.type === 'episodic' &&
            'status' in memory &&
            memory.status === 'ready' &&
            'artifacts' in memory &&
            Array.isArray(memory.artifacts) &&
            memory.artifacts.length === 1,
        )
      ) {
        break;
      }

      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }

    const episode = episodeBody.find(
      (memory) =>
        typeof memory === 'object' &&
        memory !== null &&
        'type' in memory &&
        memory.type === 'episodic',
    );

    if (typeof episode !== 'object' || episode === null) {
      throw new Error('Expected an episodic memory.');
    }

    expect(readStringProperty(episode, 'content')).toContain('柯基');
    expect(readStringProperty(episode, 'status')).toBe('ready');
    expect(readStringProperty(episode, 'type')).toBe('episodic');

    const episodeId = readStringProperty(episode, 'id');
    const artifacts =
      'artifacts' in episode && Array.isArray(episode.artifacts)
        ? episode.artifacts
        : [];

    if (artifacts.length === 0) {
      throw new Error('Expected an episodic memory artifact.');
    }

    const artifactId = readStringProperty(artifacts[0], 'id');

    await request(app.getHttpServer())
      .get(
        `/api/agents/${agentId}/memories/${episodeId}/artifacts/${artifactId}`,
      )
      .set('X-Memory-Owner-Token', ownerToken)
      .expect('Content-Type', /image\/png/)
      .expect(200);
    await request(app.getHttpServer())
      .get(
        `/api/agents/${agentId}/memories/${episodeId}/artifacts/${artifactId}`,
      )
      .set('X-Memory-Owner-Token', otherOwnerToken)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        conversationId: 'conversation-image-b',
        memoryOwnerToken: ownerToken,
        messages: [
          {
            content: '上次那只狗是什么品种？',
            role: 'user',
          },
        ],
        stream: false,
      })
      .expect(200);

    const recalledInput = chatInputs.at(-1);

    expect(recalledInput?.messages[0]?.content).toContain('柯基');
    expect(
      recalledInput?.messages.some(
        (message) =>
          Array.isArray(message.content) &&
          message.content.some(
            (part) =>
              part.type === 'image_url' &&
              part.image_url.url.startsWith('data:image/png;base64,'),
          ),
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        conversationId: 'conversation-owner-attack',
        memoryOwnerToken: otherOwnerToken,
        messages: [
          {
            attachments: [attachment],
            content: '读取别人的图片',
            role: 'user',
          },
        ],
        stream: false,
      })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/agents/${otherAgentId}/chat`)
      .send({
        memoryOwnerToken: ownerToken,
        messages: [
          {
            attachments: [attachment],
            content: '跨智能体读取图片',
            role: 'user',
          },
        ],
        stream: false,
      })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/agents/${agentId}/memories/${episodeId}`)
      .set('X-Memory-Owner-Token', ownerToken)
      .expect(204);
    await request(app.getHttpServer())
      .get(
        `/api/agents/${agentId}/memories/${episodeId}/artifacts/${artifactId}`,
      )
      .set('X-Memory-Owner-Token', ownerToken)
      .expect(404);
  });

  it('keeps a pending episode when visual extraction fails without blocking chat', async () => {
    const image = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01,
    ]);
    const upload = await request(app.getHttpServer())
      .post('/api/chat-attachments')
      .set('Content-Type', 'image/png')
      .set('Content-Length', String(image.length))
      .set('X-Agent-Id', agentId)
      .set('X-File-Name', encodeURIComponent('pending.png'))
      .set('X-Memory-Owner-Token', ownerToken)
      .send(image)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        conversationId: 'conversation-image-pending',
        memoryOwnerToken: ownerToken,
        messages: [
          {
            attachments: [upload.body],
            content: '触发视觉失败',
            role: 'user',
          },
        ],
        stream: false,
      })
      .expect(200);

    let pendingMemory: unknown;

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await request(app.getHttpServer())
        .get(`/api/agents/${agentId}/memories`)
        .set('X-Memory-Owner-Token', ownerToken)
        .expect(200);

      pendingMemory = Array.isArray(response.body)
        ? response.body.find(
            (memory: unknown) =>
              typeof memory === 'object' &&
              memory !== null &&
              'status' in memory &&
              memory.status === 'pending',
          )
        : undefined;

      if (pendingMemory) {
        break;
      }

      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }

    if (typeof pendingMemory !== 'object' || pendingMemory === null) {
      throw new Error('Expected a pending episodic memory.');
    }

    expect(readStringProperty(pendingMemory, 'content')).toContain(
      '待处理图片情景',
    );
    expect(readStringProperty(pendingMemory, 'status')).toBe('pending');
    expect(readStringProperty(pendingMemory, 'type')).toBe('episodic');
  });
});
