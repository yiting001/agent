import { ApplicationError } from '../../../shared/application/application-error';
import type { Skill, SkillTool } from '../domain/skill';
import { DeleteSkillUseCase } from './delete-skill.use-case';
import { InstallSkillUseCase } from './install-skill.use-case';
import type { McpClient } from './mcp-client';
import type { SkillRepository } from './skill.repository';
import type { SkillUsage } from './skill-usage';
import { UpdateSkillUseCase } from './update-skill.use-case';

const searchTool: SkillTool = {
  description: '搜索企业资料',
  inputSchema: { properties: { query: { type: 'string' } }, type: 'object' },
  name: 'search',
};

function skill(overrides: Partial<Skill>): Skill {
  return {
    content: '',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    description: '',
    enabled: true,
    endpoint: '',
    headers: {},
    id: 'skill-id',
    name: '技能',
    tools: [],
    type: 'prompt',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function memoryRepository(initial: Skill[] = []): SkillRepository {
  const skills = new Map(initial.map((item) => [item.id, item]));

  return {
    delete: (id: string) => {
      skills.delete(id);

      return Promise.resolve();
    },
    findById: (id: string) => Promise.resolve(skills.get(id)),
    findByIds: (ids: string[]) =>
      Promise.resolve(
        ids
          .map((id) => skills.get(id))
          .filter((item): item is Skill => item !== undefined),
      ),
    list: () => Promise.resolve([...skills.values()]),
    save: (item: Skill) => {
      skills.set(item.id, item);

      return Promise.resolve();
    },
  } as SkillRepository;
}

function mcpClient(tools: SkillTool[] = [searchTool]): {
  client: McpClient;
  listTools: jest.Mock;
} {
  const listTools = jest.fn().mockResolvedValue(tools);

  return {
    client: {
      callTool: () => Promise.resolve('工具结果'),
      listTools,
    } as McpClient,
    listTools,
  };
}

describe('InstallSkillUseCase', () => {
  it('安装提示词技能并返回摘要', async () => {
    const useCase = new InstallSkillUseCase(
      memoryRepository(),
      mcpClient().client,
    );

    const summary = await useCase.execute({
      content: '始终使用中文回答。',
      description: '语言规范',
      endpoint: '',
      headers: {},
      name: '中文回复',
      type: 'prompt',
    });

    expect(summary.type).toBe('prompt');
    expect(summary.enabled).toBe(true);
    expect(summary.tools).toEqual([]);
  });

  it('提示词技能缺少内容时拒绝安装', async () => {
    const useCase = new InstallSkillUseCase(
      memoryRepository(),
      mcpClient().client,
    );

    await expect(
      useCase.execute({
        content: ' ',
        description: '',
        endpoint: '',
        headers: {},
        name: '空技能',
        type: 'prompt',
      }),
    ).rejects.toThrow(ApplicationError);
  });

  it('安装 MCP 技能时连接服务并缓存工具清单', async () => {
    const { client, listTools } = mcpClient();
    const useCase = new InstallSkillUseCase(memoryRepository(), client);

    const summary = await useCase.execute({
      content: '',
      description: '企业搜索',
      endpoint: 'http://mcp.test/mcp',
      headers: { authorization: 'Bearer secret' },
      name: '搜索工具',
      type: 'mcp',
    });

    expect(listTools).toHaveBeenCalledWith({
      endpoint: 'http://mcp.test/mcp',
      headers: { authorization: 'Bearer secret' },
    });
    expect(summary.tools).toEqual([searchTool]);
    expect(JSON.stringify(summary)).not.toContain('Bearer secret');
  });

  it('MCP 技能缺少服务地址时拒绝安装', async () => {
    const useCase = new InstallSkillUseCase(
      memoryRepository(),
      mcpClient().client,
    );

    await expect(
      useCase.execute({
        content: '',
        description: '',
        endpoint: '',
        headers: {},
        name: '无地址',
        type: 'mcp',
      }),
    ).rejects.toThrow(ApplicationError);
  });
});

describe('UpdateSkillUseCase', () => {
  it('更新 MCP 技能时刷新工具清单', async () => {
    const repository = memoryRepository([
      skill({ endpoint: 'http://mcp.test/mcp', tools: [], type: 'mcp' }),
    ]);
    const useCase = new UpdateSkillUseCase(repository, mcpClient().client);

    const summary = await useCase.execute({
      content: '',
      description: '',
      enabled: true,
      endpoint: 'http://mcp.test/mcp',
      id: 'skill-id',
      name: '搜索工具',
    });

    expect(summary.tools).toEqual([searchTool]);
  });

  it('技能不存在时返回 not_found', async () => {
    const useCase = new UpdateSkillUseCase(
      memoryRepository(),
      mcpClient().client,
    );

    await expect(
      useCase.execute({
        content: '内容',
        description: '',
        enabled: true,
        endpoint: '',
        id: 'missing',
        name: '技能',
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('DeleteSkillUseCase', () => {
  it('技能仍被智能体绑定时拒绝卸载', async () => {
    const usage = { countBoundAgents: () => Promise.resolve(2) } as SkillUsage;
    const useCase = new DeleteSkillUseCase(
      memoryRepository([skill({})]),
      usage,
    );

    await expect(useCase.execute('skill-id')).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('未绑定的技能可以卸载', async () => {
    const repository = memoryRepository([skill({})]);
    const usage = { countBoundAgents: () => Promise.resolve(0) } as SkillUsage;
    const useCase = new DeleteSkillUseCase(repository, usage);

    await useCase.execute('skill-id');

    await expect(repository.findById('skill-id')).resolves.toBeUndefined();
  });
});
