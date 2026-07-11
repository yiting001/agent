import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html: true, linkify: true });

/** 将 Markdown 渲染为经过 XSS 消毒的 HTML，供 v-html 安全使用。 */
export function renderMarkdownToHtml(source: string): string {
  return DOMPurify.sanitize(markdown.render(source));
}
