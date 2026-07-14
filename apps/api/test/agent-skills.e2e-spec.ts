import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';
import { VectorIndex } from '../src/modules/knowledge/application/vector-index';
import type {
  EmbeddingInput,
  ToolChatInput,
  ToolChatResult,
} from '../src/modules/model-providers/application/model-gateway';
import { ModelGateway } from '../src/modules/model-providers/application/model-gateway';
import { McpClient } from '../src/modules/skills/application/mcp-client';
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

describe('Agent skills', () => {
  let app: INestApplication<Server>;
  const toolChatResults: ToolChatResult[] = [];
  const mcpToolCalls: Array<{ args: Record<string, unknown>; name: string }> =
    [];

  beforeAll(async () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '33'.repeat(32);
    process.env.DATABASE_MIGRATIONS_RUN = 'false';
    process.env.DATABASE_SYNCHRONIZE = 'true';
    process.env.INGESTION_POLL_INTERVAL_MS = '60000';

    const modelGateway = {
      chat: jest.fn().mockResolvedValue('普通回答'),
      chatWithTools: jest.fn().mockImplementation((input: ToolChatInput) => {
        expect(input.tools.length).toBeGreaterThan(0);
        const next = toolChatResults.shift();

        if (!next) {
          throw new Error('No mocked tool chat result.');
        }

        return Promise.resolve(next);
      }),
      embed: jest
        .fn()
        .mockImplementation((input: EmbeddingInput) =>
          Promise.resolve(input.input.map(() => [0.1, 0.2, 0.3])),
        ),
      streamChat: jest.fn().mockImplementation(async function* () {
        await Promise.resolve();
        yield '普通回答';
      }),
      verify: jest.fn().mockResolvedValue(undefined),
    };
    const mcpClient = {
      callTool: jest
        .fn()
        .mockImplementation(
          (
            _connection: unknown,
            name: string,
            args: Record<string, unknown>,
          ) => {
            mcpToolCalls.push({ args, name });

            return Promise.resolve('企业搜索结果');
          },
        ),
      listTools: jest.fn().mockResolvedValue([
        {
          description: '搜索企业资料',
          inputSchema: { properties: {}, type: 'object' },
          name: 'search',
        },
      ]),
    };
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ModelGateway)
      .useValue(modelGateway)
      .overrideProvider(McpClient)
      .useValue(mcpClient)
      .overrideProvider(VectorIndex)
      .useValue({
        ensureCollection: jest.fn().mockResolvedValue(undefined),
        search: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue(undefined),
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
  });

  it('supports skill install, agent binding, MCP tool calling and delete protection', async () => {
    const promptSkillResponse = await request(app.getHttpServer())
      .post('/api/skills')
      .send({
        content: '始终使用中文回答。',
        description: '语言规范',
        name: '中文回复',
        type: 'prompt',
      })
      .expect(201);
    const promptSkillId = readString(
      parseRecord(promptSkillResponse.text),
      'id',
    );

    const mcpSkillResponse = await request(app.getHttpServer())
      .post('/api/skills')
      .send({
        description: '企业搜索',
        endpoint: 'http://mcp.test/mcp',
        headers: { authorization: 'Bearer secret' },
        name: '搜索工具',
        type: 'mcp',
      })
      .expect(201);
    const mcpSkill = parseRecord(mcpSkillResponse.text);
    const mcpSkillId = readString(mcpSkill, 'id');

    expect(mcpSkillResponse.text).not.toContain('Bearer secret');

    const listResponse = await request(app.getHttpServer())
      .get('/api/skills')
      .expect(200);

    expect(listResponse.text).toContain(promptSkillId);
    expect(listResponse.text).toContain(mcpSkillId);
    expect(listResponse.text).not.toContain('Bearer secret');

    await request(app.getHttpServer())
      .put(`/api/skills/${promptSkillId}`)
      .send({
        content: '始终使用简体中文回答。',
        description: '语言规范',
        enabled: true,
        name: '中文回复',
      })
      .expect(200);

    const providerResponse = await request(app.getHttpServer())
      .put('/api/model-providers/skill-provider')
      .send({
        apiKey: 'test-key',
        baseUrl: 'http://model.test/v1',
        chatModel: 'chat-model',
        description: '测试模型服务',
        embeddingModel: 'embedding-model',
        name: '测试模型',
      })
      .expect(200);
    const providerId = readString(parseRecord(providerResponse.text), 'id');

    const baseResponse = await request(app.getHttpServer())
      .post('/api/knowledge-bases')
      .send({
        description: '技能测试知识库',
        embeddingProviderId: providerId,
        name: '技能知识库',
      })
      .expect(201);
    const modules = parseRecord(baseResponse.text).modules;

    if (!Array.isArray(modules) || modules.length === 0) {
      throw new Error('Expected a default knowledge module.');
    }

    const moduleId = readString(parseRecord(JSON.stringify(modules[0])), 'id');

    const agentResponse = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        description: '带技能的助手',
        moduleIds: [moduleId],
        name: '技能助手',
        providerId,
        skillIds: [promptSkillId, mcpSkillId],
        systemPrompt: '请依据企业知识回答。',
        temperature: 0.2,
      })
      .expect(201);
    const agent = parseRecord(agentResponse.text);
    const agentId = readString(agent, 'id');

    expect(agent.skillIds).toEqual([promptSkillId, mcpSkillId]);

    toolChatResults.push(
      {
        content: '',
        toolCalls: [
          { arguments: '{"query":"政策"}', id: 'call-1', name: 'search' },
        ],
      },
      { content: '根据企业搜索结果的最终回答', toolCalls: [] },
    );

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        messages: [{ content: '查一下政策', role: 'user' }],
        stream: false,
      })
      .expect(200)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'answer')).toBe(
          '根据企业搜索结果的最终回答',
        );
      });

    expect(mcpToolCalls).toEqual([{ args: { query: '政策' }, name: 'search' }]);

    await request(app.getHttpServer())
      .delete(`/api/skills/${mcpSkillId}`)
      .expect(409);

    await request(app.getHttpServer())
      .put(`/api/agents/${agentId}`)
      .send({
        description: '带技能的助手',
        moduleIds: [moduleId],
        name: '技能助手',
        providerId,
        skillIds: [promptSkillId],
        systemPrompt: '请依据企业知识回答。',
        temperature: 0.2,
      })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/skills/${mcpSkillId}`)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/skills/${promptSkillId}`)
      .expect(409);
  });
});
