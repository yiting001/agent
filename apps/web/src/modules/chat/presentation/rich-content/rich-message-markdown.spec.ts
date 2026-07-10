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

<script>alert('xss')</script>
`);

    expect(output).toContain('<h1>分析结果</h1>');
    expect(output).toContain('class="katex"');
    expect(output).toContain('data-visualization="echarts"');
    expect(output).not.toContain("<script>alert('xss')</script>");
  });
});
