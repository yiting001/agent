import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';

const VISUALIZATION_TYPES = new Set(['d3', 'echarts', 'mermaid']);

function visualizationPlaceholder(type: string, source: string): string {
  return [
    `<div class="rich-visualization" data-visualization="${type}"`,
    ` data-source="${encodeURIComponent(source)}">`,
    '<span class="rich-visualization__loading">图表生成中…</span>',
    '</div>',
  ].join('');
}

function createMarkdownRenderer(): MarkdownIt {
  const markdown = new MarkdownIt({
    breaks: true,
    html: false,
    linkify: true,
    typographer: true,
  }).use(markdownItKatex);
  const renderFence = markdown.renderer.rules.fence;

  markdown.renderer.rules.fence = (
    tokens,
    index,
    options,
    environment,
    self,
  ): string => {
    const token = tokens[index];
    const type = token?.info.trim().toLowerCase();

    if (token && type && VISUALIZATION_TYPES.has(type)) {
      return visualizationPlaceholder(type, token.content);
    }

    return renderFence
      ? renderFence(tokens, index, options, environment, self)
      : self.renderToken(tokens, index, options);
  };

  return markdown;
}

const markdown = createMarkdownRenderer();

export function renderRichMarkdown(content: string): string {
  return markdown.render(content);
}
