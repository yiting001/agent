import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';

const VISUALIZATION_TYPES = new Set(['d3', 'echarts', 'mermaid']);

/** 将受支持的图表代码块转换为延迟渲染占位符。 */
function visualizationPlaceholder(type: string, source: string): string {
  return [
    `<div class="rich-visualization" data-visualization="${type}"`,
    ` data-source="${encodeURIComponent(source)}">`,
    '<span class="rich-visualization__loading">图表生成中…</span>',
    '</div>',
  ].join('');
}

/** 配置 Markdown、KaTeX 和图表 fence 的单例渲染器。 */
function createMarkdownRenderer(): MarkdownIt {
  const markdown = new MarkdownIt({
    breaks: true,
    html: true,
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

/**
 * 允许模型输出的内联 HTML（如表格单元格内的 <br>、<ul>）参与渲染，
 * 再经 DOMPurify 白名单消毒去除脚本等危险内容，兼顾排版与安全。
 */
export function renderRichMarkdown(content: string): string {
  return DOMPurify.sanitize(markdown.render(content));
}
