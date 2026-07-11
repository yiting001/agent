import { describe, expect, it } from 'vitest';

import { splitContentSegments } from './content-segment';

describe('splitContentSegments', () => {
  it('切出已注册语言的图表片段并保留前后 Markdown', () => {
    const source = '前文\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n后文';
    const segments = splitContentSegments(source, ['mermaid']);

    expect(segments).toEqual([
      { kind: 'markdown', source: '前文\n\n' },
      { code: 'flowchart LR\n  A --> B', kind: 'chart', language: 'mermaid' },
      { kind: 'markdown', source: '\n\n后文' },
    ]);
  });

  it('未注册的语言保持为普通 Markdown', () => {
    const source = '```python\nprint(1)\n```';
    expect(splitContentSegments(source, ['mermaid'])).toEqual([
      { kind: 'markdown', source },
    ]);
  });

  it('纯 Markdown 内容返回单一片段', () => {
    expect(splitContentSegments('# 标题', ['mermaid'])).toEqual([
      { kind: 'markdown', source: '# 标题' },
    ]);
  });
});
