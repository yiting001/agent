/** 富文本内容片段：普通 Markdown 或需要专用渲染器的图表代码块。 */
export interface MarkdownSegment {
  readonly kind: 'markdown';
  readonly source: string;
}

/** 图表片段：language 对应已注册的图表渲染器。 */
export interface ChartSegment {
  readonly kind: 'chart';
  readonly language: string;
  readonly code: string;
}

export type ContentSegment = MarkdownSegment | ChartSegment;

/** 匹配围栏代码块（```lang ... ```），用于识别图表片段。 */
const FENCE_PATTERN = /^```([\w-]+)[^\n]*\n([\s\S]*?)^```[ \t]*$/gm;

/**
 * 将 Markdown 源文本切分为普通片段与图表片段。
 * 仅当围栏语言命中 chartLanguages 时才切出图表片段，其余内容原样保留。
 */
export function splitContentSegments(
  source: string,
  chartLanguages: readonly string[],
): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let cursor = 0;

  for (const match of source.matchAll(FENCE_PATTERN)) {
    const fence = match[0];
    const language = match[1] ?? '';
    const code = match[2] ?? '';
    if (!chartLanguages.includes(language)) {
      continue;
    }
    const markdown = source.slice(cursor, match.index);
    if (markdown.trim().length > 0) {
      segments.push({ kind: 'markdown', source: markdown });
    }
    segments.push({ code: code.trimEnd(), kind: 'chart', language });
    cursor = match.index + fence.length;
  }

  const tail = source.slice(cursor);
  if (tail.trim().length > 0) {
    segments.push({ kind: 'markdown', source: tail });
  }
  return segments;
}
