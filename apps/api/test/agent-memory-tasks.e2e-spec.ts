import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { AgentMemoryMaintenanceService } from '../src/modules/agent-memory/application/agent-memory-maintenance.service';
import { AgentMemoryIndex } from '../src/modules/agent-memory/application/agent-memory.index';
import { AgentMemoryTaskRepository } from '../src/modules/agent-memory/application/agent-memory-task.repository';
import { ProcessNextAgentMemoryTaskUseCase } from '../src/modules/agent-memory/application/process-next-agent-memory-task.use-case';
import { AgentMemoryTaskEntity } from '../src/modules/agent-memory/infrastructure/agent-memory-task.entity';
import { AgentMemoryTaskScheduler } from '../src/modules/agent-memory/infrastructure/agent-memory-task.scheduler';
import { AgentMemoryEntity } from '../src/modules/agent-memory/infrastructure/agent-memory.entity';
import { ChatAttachmentStorage } from '../src/modules/chat/application/chat-attachment.storage';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';
import type {
  ChatCompletionInput,
  EmbeddingInput,
} from '../src/modules/model-providers/application/model-gateway';
import { ModelGateway } from '../src/modules/model-providers/application/model-gateway';
import { ApplicationErrorFilter } from '../src/shared/presentation/application-error.filter';
import { createControlledTaskScheduler } from './controlled-task-scheduler';
import { uploadTestImage, waitForMemoryId } from './agent-memory-test-helpers';
import { createInMemoryAgentMemoryIndex } from './in-memory-agent-memory.index';
import { readStringProperty } from './read-value';

describe('Agent memory task queue', () => {
  let agentId = '';
  let app: INestApplication<Server>;
  let failNextIndexUpsert = false;
  let memoryIndex: AgentMemoryIndex;
  let otherAgentId = '';
  const ownerKey = 'owner-memory-task-e2e';
  let processNext: ProcessNextAgentMemoryTaskUseCase;
  let tasks: AgentMemoryTaskRepository;

  beforeAll(async () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '55'.repeat(32);
    process.env.DATABASE_MIGRATIONS_RUN = 'false';
    process.env.DATABASE_SYNCHRONIZE = 'true';
    process.env.AGENT_MEMORY_TASK_BACKOFF_BASE_MS = '1';
    process.env.AGENT_MEMORY_TASK_MAX_ATTEMPTS = '2';
    process.env.AGENT_MEMORY_TASK_POLL_INTERVAL_MS = '60000';
    process.env.AGENT_MEMORY_PENDING_TIMEOUT_MS = '1';

    const modelGateway = {
      chat: jest.fn().mockImplementation((input: ChatCompletionInput) => {
        const messages = JSON.stringify(input.messages);

        if (messages.includes('触发视觉失败')) {
          return Promise.reject(new Error('vision unavailable'));
        }

        return Promise.resolve(
          JSON.stringify({
            entities: ['狗', '公园'],
            importance: 3,
            summary: '用户曾分享一张在公园拍摄的小狗图片。',
          }),
        );
      }),
      chatWithTools: jest.fn().mockResolvedValue({
        content: '任务队列回答',
        toolCalls: [],
      } satisfies Awaited<ReturnType<ModelGateway['chatWithTools']>>),
      embed: jest
        .fn()
        .mockImplementation((input: EmbeddingInput) =>
          Promise.resolve(input.input.map(() => [0.1, 0.2, 0.3])),
        ),
      streamChat: jest.fn().mockImplementation(async function* () {
        await Promise.resolve();
        yield '任务队列回答';
      }),
      verify: jest.fn().mockResolvedValue(undefined),
    };
    const baseMemoryIndex = createInMemoryAgentMemoryIndex();

    memoryIndex = {
      clear: (nextAgentId, nextOwnerKey): Promise<void> =>
        baseMemoryIndex.clear(nextAgentId, nextOwnerKey),
      delete: (memoryIds): Promise<void> => baseMemoryIndex.delete(memoryIds),
      exists: (memoryId): Promise<boolean> => baseMemoryIndex.exists(memoryId),
      search: (input): ReturnType<AgentMemoryIndex['search']> =>
        baseMemoryIndex.search(input),
      upsert: async (dimensions, memories): Promise<void> => {
        if (failNextIndexUpsert) {
          failNextIndexUpsert = false;
          throw new Error('vector index unavailable');
        }

        await baseMemoryIndex.upsert(dimensions, memories);
      },
    };

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
      .overrideProvider(AgentMemoryTaskScheduler)
      .useValue(createControlledTaskScheduler(() => processNext.execute()))
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
    processNext = app.get(ProcessNextAgentMemoryTaskUseCase);
    tasks = app.get(AgentMemoryTaskRepository);

    const provider = await request(app.getHttpServer())
      .put('/api/model-providers/memory-task-provider')
      .send({
        apiKey: 'memory-task-key',
        baseUrl: 'https://model.test/v1',
        chatModel: 'memory-model',
        description: '记忆任务 E2E 模型',
        embeddingDimensions: 3,
        embeddingModel: 'embedding-model',
        name: '记忆任务模型',
      })
      .expect(200);
    const providerId = readStringProperty(provider.body, 'id');

    const createAgent = async (name: string): Promise<string> => {
      const response = await request(app.getHttpServer())
        .post('/api/agents')
        .send({
          description: '验证记忆任务队列',
          moduleIds: [],
          name,
          providerId,
          skillIds: [],
          systemPrompt: '请依据上下文回答。',
          temperature: 0.2,
        })
        .expect(201);

      return readStringProperty(response.body, 'id');
    };

    agentId = await createAgent('记忆任务智能体');
    otherAgentId = await createAgent('另一记忆任务智能体');
  });

  afterAll(async () => {
    await app.close();
  });

  it('deduplicates concurrent episodes and recovers vector index inconsistency', async () => {
    const attachment = await uploadTestImage(app, {
      agentId,
      fileName: 'idempotent.png',
      ownerKey,
    });
    const chatRequest = {
      conversationId: 'conversation-idempotent',
      memoryOwnerKey: ownerKey,
      messages: [
        {
          attachments: [attachment],
          content: '并发写入同一图片情景。',
          role: 'user',
        },
      ],
      stream: false,
    };

    await Promise.all([
      request(app.getHttpServer())
        .post(`/api/agents/${agentId}/chat`)
        .send(chatRequest)
        .expect(200),
      request(app.getHttpServer())
        .post(`/api/agents/${agentId}/chat`)
        .send(chatRequest)
        .expect(200),
    ]);
    await new Promise<void>((resolve) => setTimeout(resolve, 30));

    const memories = await request(app.getHttpServer())
      .get(`/api/agents/${agentId}/memories`)
      .query({ ownerKey })
      .expect(200);
    const episodes = Array.isArray(memories.body)
      ? (memories.body as unknown[]).filter(
          (memory) =>
            typeof memory === 'object' &&
            memory !== null &&
            'sourceThreadId' in memory &&
            memory.sourceThreadId === 'conversation-idempotent',
        )
      : [];

    expect(episodes).toHaveLength(1);
    const memoryId = readStringProperty(episodes[0], 'id');

    failNextIndexUpsert = true;
    expect(await processNext.execute()).toBe(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 2));
    expect(await processNext.execute()).toBe(true);
    expect(await memoryIndex.exists(memoryId)).toBe(true);

    await memoryIndex.delete([memoryId]);
    await request(app.getHttpServer())
      .get(`/api/agents/${agentId}/memory-health`)
      .query({ ownerKey })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.objectContaining({ readyWithoutIndex: 1 }));
      });
    expect(await processNext.execute()).toBe(true);
    expect(await memoryIndex.exists(memoryId)).toBe(true);
  });

  it('retries model failures to dead and isolates management operations', async () => {
    const attachment = await uploadTestImage(app, {
      agentId,
      fileName: 'dead.png',
      ownerKey,
    });

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        conversationId: 'conversation-dead',
        memoryOwnerKey: ownerKey,
        messages: [
          {
            attachments: [attachment],
            content: '触发视觉失败',
            role: 'user',
          },
        ],
        stream: false,
      })
      .expect(200);
    let retried = false;

    for (let attempt = 0; attempt < 20 && !retried; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      retried = await processNext.execute();
    }

    expect(retried).toBe(true);

    const deadResponse = await request(app.getHttpServer())
      .get(`/api/agents/${agentId}/memory-tasks`)
      .query({ ownerKey, status: 'dead' })
      .expect(200);
    const deadBody: unknown = deadResponse.body;

    expect(deadBody).toEqual([
      expect.objectContaining({
        attempts: 2,
        kind: 'extract',
        status: 'dead',
      }),
    ]);
    await request(app.getHttpServer())
      .get(`/api/agents/${agentId}/memory-tasks`)
      .query({ ownerKey: 'other-owner', status: 'dead' })
      .expect(200, []);
    await request(app.getHttpServer())
      .get(`/api/agents/${otherAgentId}/memory-tasks`)
      .query({ ownerKey, status: 'dead' })
      .expect(200, []);

    if (!Array.isArray(deadBody) || deadBody.length === 0) {
      throw new Error('Expected a dead memory task.');
    }

    const memoryId = readStringProperty(deadBody[0], 'memoryId');

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/memories/${memoryId}/retry`)
      .query({ ownerKey: 'other-owner' })
      .expect(202, { recovered: 0 });
    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/memories/${memoryId}/retry`)
      .query({ ownerKey })
      .expect(202, { recovered: 1 });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 2));
      await processNext.execute();
    }
    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/memory-tasks/recover`)
      .query({ ownerKey })
      .expect(202, { recovered: 1 });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 2));
      await processNext.execute();
    }
  });

  it('reclaims expired processing leases after restart', async () => {
    const now = new Date();

    await tasks.enqueueEpisode({
      agentId,
      artifacts: [
        {
          agentId,
          attachmentId: 'missing-after-restart',
          fileName: 'restart.png',
          mimeType: 'image/png',
          ownerKey,
          sizeBytes: 10,
        },
      ],
      content: '待恢复情景',
      idempotencyKey: 'restart-recovery-key',
      maxAttempts: 2,
      now,
      ownerKey,
      sourceThreadId: 'conversation-restart',
    });
    const claims = await Promise.all([
      tasks.claimNextTask({
        lockOwner: 'terminated-instance',
        now,
      }),
      tasks.claimNextTask({
        lockOwner: 'competing-instance',
        now,
      }),
    ]);
    const claimed = claims.find((task) => task !== undefined);

    expect(claimed?.status).toBe('processing');
    expect(claims.filter((task) => task !== undefined)).toHaveLength(1);
    expect(
      await tasks.reclaimExpired({
        lockTimeoutMs: 1,
        now: new Date(now.getTime() + 10),
      }),
    ).toBeGreaterThanOrEqual(1);
    const queued = await tasks.listTasks({
      agentId,
      ownerKey,
      status: 'queued',
    });

    expect(queued).toEqual([
      expect.objectContaining({
        lockOwner: undefined,
        memoryId: claimed?.memoryId,
        status: 'queued',
      }),
    ]);
    await tasks.markMemoryFailed({
      agentId,
      memoryId: claimed?.memoryId ?? '',
      now: new Date(),
      ownerKey,
      reason: 'restart recovery assertion completed',
    });
  });

  it('marks memories failed and removes indexes when media is missing', async () => {
    const image = await uploadTestImage(app, {
      agentId,
      fileName: 'missing-evidence.png',
      ownerKey,
    });
    const attachmentId = readStringProperty(image, 'id');
    const sourceThreadId = 'conversation-missing-evidence';

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        conversationId: sourceThreadId,
        memoryOwnerKey: ownerKey,
        messages: [
          {
            attachments: [image],
            content: '这张图的原始媒体稍后会丢失',
            role: 'user',
          },
        ],
      })
      .expect(200);
    const memoryId = await waitForMemoryId(app, {
      agentId,
      ownerKey,
      sourceThreadId,
    });

    for (
      let attempt = 0;
      attempt < 20 && !(await memoryIndex.exists(memoryId));
      attempt += 1
    ) {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      await processNext.execute();
    }

    const storage = app.get(ChatAttachmentStorage);

    expect(await memoryIndex.exists(memoryId)).toBe(true);
    await storage.delete(attachmentId, { agentId, ownerKey });
    await request(app.getHttpServer())
      .get(`/api/agents/${agentId}/memory-health`)
      .query({ ownerKey })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/agents/${agentId}/memories`)
      .query({ ownerKey })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: memoryId, status: 'failed' }),
          ]),
        );
      });
    expect(await memoryIndex.exists(memoryId)).toBe(false);
  });

  it('recreates a missing task for a historical pending memory', async () => {
    const image = await uploadTestImage(app, {
      agentId,
      fileName: 'historical-pending.png',
      ownerKey,
    });
    const now = new Date();
    const { memory } = await tasks.enqueueEpisode({
      agentId,
      artifacts: [
        {
          agentId,
          attachmentId: readStringProperty(image, 'id'),
          fileName: 'historical-pending.png',
          mimeType: 'image/png',
          ownerKey,
          sizeBytes: 9,
        },
      ],
      content: '历史 pending 图片情景',
      idempotencyKey: 'historical-pending-key',
      maxAttempts: 2,
      now,
      ownerKey,
      sourceThreadId: 'conversation-historical-pending',
    });
    const dataSource = app.get(DataSource);

    await dataSource
      .getRepository(AgentMemoryTaskEntity)
      .delete({ memoryId: memory.id });
    await dataSource.getRepository(AgentMemoryEntity).update(memory.id, {
      updatedAt: new Date(now.getTime() - 10),
    });
    const repair = await app
      .get(AgentMemoryMaintenanceService)
      .repairOwner(agentId, ownerKey);

    expect(repair.queuedExtractTasks).toBe(1);
    expect(
      await tasks.listTasks({ agentId, ownerKey, status: 'queued' }),
    ).toEqual([
      expect.objectContaining({
        kind: 'extract',
        memoryId: memory.id,
      }),
    ]);
  });
});
