declare module 'markdown-it-katex' {
  import type MarkdownIt from 'markdown-it';

  const markdownItKatex: (markdown: MarkdownIt) => void;

  export default markdownItKatex;
}
