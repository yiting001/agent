import type { PromptPolicy } from '../../prompt-policies/domain/prompt-policy';
import type { Skill } from '../../skills/domain/skill';
import { composeSystemPrompt } from './system-prompt.composer';

function policy(): PromptPolicy {
  return {
    category: 'output',
    content: '默认输出安全 HTML。',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    description: '',
    enabled: true,
    id: 'policy-id',
    key: 'rich-output',
    name: '富内容输出',
    priority: 100,
    revision: 1,
    source: 'builtin',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function skill(): Skill {
  return {
    content: '财务数字保留两位小数。',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    description: '',
    enabled: true,
    endpoint: '',
    headers: {},
    id: 'skill-id',
    name: '财务格式',
    tools: [],
    type: 'prompt',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('composeSystemPrompt', () => {
  it('keeps built-in policies, knowledge, memory and skills in separate sections', () => {
    const output = composeSystemPrompt({
      agentPrompt: '你是财务分析助手。',
      episodicContext: '历史图片证据',
      knowledge: [{ content: '本月收入 100 万元。', fileName: '月报.pdf' }],
      longTermContext: '用户偏好人民币。',
      policies: [policy()],
      skills: [skill()],
    });

    expect(output).toContain('你是财务分析助手。');
    expect(output).toContain('### 富内容输出\n默认输出安全 HTML。');
    expect(output).toContain('[资料 1｜月报.pdf]\n本月收入 100 万元。');
    expect(output).toContain('用户偏好人民币。');
    expect(output).toContain('历史图片证据');
    expect(output).toContain('### 财务格式\n财务数字保留两位小数。');
    expect(output.indexOf('### 富内容输出')).toBeLessThan(
      output.indexOf('[资料 1｜月报.pdf]'),
    );
  });

  it('provides explicit fallbacks when knowledge and episodic evidence are empty', () => {
    const output = composeSystemPrompt({
      agentPrompt: '回答问题。',
      episodicContext: '',
      knowledge: [],
      longTermContext: '',
      policies: [],
      skills: [],
    });

    expect(output).toContain('未检索到可用知识片段。');
    expect(output).toContain('未检索到足够可靠的历史图片情景');
  });
});
