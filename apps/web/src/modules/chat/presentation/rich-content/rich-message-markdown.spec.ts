// @vitest-environment jsdom
// DOMPurify 消毒依赖 DOM 环境，本文件在 jsdom 中运行。
import { describe, expect, it } from 'vitest';

import { renderRichMarkdown } from './rich-message-markdown';

describe('renderRichMarkdown', () => {
  it('renders safe markdown, formulas and visualization placeholders', () => {
    const output = renderRichMarkdown(`
# 分析结果

公式：$E = mc^2$

\`\`\`echarts
{"series":[]}
\`\`\`

\`\`\`three
{"objects":[{"type":"box"}]}
\`\`\`

<script>alert('xss')</script>
`);

    expect(output).toContain('<h1>分析结果</h1>');
    expect(output).toContain('class="katex"');
    expect(output).toContain('data-visualization="echarts"');
    expect(output).toContain('data-visualization="three"');
    expect(output).not.toContain("<script>alert('xss')</script>");
  });

  it('keeps safe inline html such as <br> in table cells', () => {
    const output = renderRichMarkdown(
      '| 项目 | 内容 |\n| --- | --- |\n| 步骤 | 1. 总则<br>2. 描述 |',
    );

    expect(output).toContain('1. 总则<br>2. 描述');
  });

  it('strips dangerous attributes while keeping the element', () => {
    const output = renderRichMarkdown(
      '<em onclick="alert(1)" style="position:fixed">重点</em><img src="https://tracker.example/pixel">',
    );

    expect(output).toContain('<em>重点</em>');
    expect(output).not.toContain('onclick');
    expect(output).not.toContain('style');
    expect(output).not.toContain('<img');
    expect(output).not.toContain('tracker.example');
  });
});
