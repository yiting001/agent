import type { ConfigService } from '@nestjs/config';

import { ApplicationError } from '../../../shared/application/application-error';
import type {
  ModelGateway,
  ToolChatResult,
} from '../../model-providers/application/model-gateway';
import type { SkillRuntimeService } from '../../skills/application/skill-runtime.service';
import type { Skill } from '../../skills/domain/skill';
import type { ObservabilityService } from '../../observability/application/observability.service';
import { SkillToolLoopService } from './skill-tool-loop.service';

const mcpSkill: Skill = {
  content: '',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  description: '',
  enabled: true,
  endpoint: 'http://mcp.test/mcp',
  headers: {},
  id: 'skill-id',
  name: '搜索工具',
  tools: [
    {
      description: '搜索企业资料',
      inputSchema: { properties: {}, type: 'object' },
      name: 'search',
    },
  ],
  type: 'mcp',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function configService(maxRounds: number): ConfigService {
  return {
    getOrThrow: () => ({ skillToolMaxRounds: maxRounds }),
  } as unknown as ConfigService;
}

function buildService(
  results: ToolChatResult[],
  maxRounds = 3,
): { calls: unknown[]; service: SkillToolLoopService } {
  const calls: unknown[] = [];
  const gateway = {
    chatWithTools: jest.fn().mockImplementation(() => {
      const next = results.shift();

      if (!next) {
        throw new Error('No more mocked results.');
      }

      return Promise.resolve(next);
    }),
  } as unknown as ModelGateway;
  const runtime = {
    callTool: (skill: Skill, name: string, args: Record<string, unknown>) => {
      calls.push({ args, name, skillId: skill.id });

      return Promise.resolve('工具结果');
    },
  } as SkillRuntimeService;
  const observability = {
    track: (_input: unknown, operation: () => Promise<unknown>) => operation(),
  } as ObservabilityService;

  return {
    calls,
    service: new SkillToolLoopService(
      gateway,
      runtime,
      observability,
      configService(maxRounds),
    ),
  };
}

const request = {
  apiKey: 'key',
  baseUrl: 'http://model.test/v1',
  messages: [{ content: '问题', role: 'user' as const }],
  model: 'chat-model',
  temperature: 0.2,
};

describe('SkillToolLoopService', () => {
  it('模型请求工具时执行 MCP 工具并回填结果续跑', async () => {
    const { calls, service } = buildService([
      {
        content: '',
        toolCalls: [
          { arguments: '{"query":"政策"}', id: 'call-1', name: 'search' },
        ],
      },
      { content: '最终回答', toolCalls: [] },
    ]);

    await expect(service.run(request, [mcpSkill])).resolves.toBe('最终回答');
    expect(calls).toEqual([
      { args: { query: '政策' }, name: 'search', skillId: 'skill-id' },
    ]);
  });

  it('模型未请求工具时直接返回回答', async () => {
    const { calls, service } = buildService([
      { content: '直接回答', toolCalls: [] },
    ]);

    await expect(service.run(request, [mcpSkill])).resolves.toBe('直接回答');
    expect(calls).toEqual([]);
  });

  it('超出最大轮数时终止并抛出错误', async () => {
    const toolCallResult: ToolChatResult = {
      content: '',
      toolCalls: [{ arguments: '{}', id: 'call-x', name: 'search' }],
    };
    const { service } = buildService([toolCallResult, toolCallResult], 2);

    await expect(service.run(request, [mcpSkill])).rejects.toThrow(
      ApplicationError,
    );
  });
});
