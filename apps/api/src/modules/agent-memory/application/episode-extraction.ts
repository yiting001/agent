import type { ChatMessageInput } from '../../model-providers/application/model-gateway';

export interface EpisodeExtraction {
  entities: string[];
  importance: number;
  summary: string;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 1)}…`;
}

function parseJsonObject(value: string): Record<string, unknown> | undefined {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');

  if (start < 0 || end <= start) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(value.slice(start, end + 1));

    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export function parseEpisodeExtraction(
  value: string,
): EpisodeExtraction | undefined {
  const parsed = parseJsonObject(value);
  const summary = parsed?.summary;
  const entities = parsed?.entities;
  const importance = parsed?.importance;

  if (
    typeof summary !== 'string' ||
    !summary.trim() ||
    !Array.isArray(entities) ||
    !entities.every((entity) => typeof entity === 'string') ||
    typeof importance !== 'number'
  ) {
    return undefined;
  }

  return {
    entities: [
      ...new Set(
        entities.map((entity) => truncate(entity.trim(), 40)).filter(Boolean),
      ),
    ].slice(0, 20),
    importance: Math.min(5, Math.max(1, Math.round(importance))),
    summary: truncate(summary.trim(), 500),
  };
}

export function buildEpisodeExtractionMessages(input: {
  answer: string;
  imageUrls: string[];
  userContent: string;
}): ChatMessageInput[] {
  return [
    {
      content:
        '你是情景记忆提取器。只输出 JSON，不输出 Markdown。' +
        '格式：{"summary":"客观事件摘要","entities":["可检索实体"],"importance":1}。' +
        '只记录图片中可确认内容和用户明确表达，不推断图片中的对象属于用户，' +
        '不识别或推断敏感身份。summary 不超过 200 字，entities 不超过 20 个。',
      role: 'system',
    },
    {
      content: [
        {
          text:
            `用户文字：${input.userContent.trim() || '未附文字说明'}\n` +
            `助手当时回答：${input.answer.trim() || '无'}`,
          type: 'text',
        },
        ...input.imageUrls.map((url) => ({
          image_url: { url },
          type: 'image_url' as const,
        })),
      ],
      role: 'user',
    },
  ];
}

export function formatReadyEpisode(extraction: EpisodeExtraction): string {
  const entities =
    extraction.entities.length > 0
      ? `\n可检索实体：${extraction.entities.join('、')}`
      : '';

  return `情景摘要：${extraction.summary}${entities}`;
}

export function formatPendingEpisode(
  fileNames: string[],
  userContent: string,
): string {
  const text = userContent.trim();
  const note = text ? `；用户附言：${truncate(text, 240)}` : '';

  return `待处理图片情景：用户分享了 ${fileNames.join('、')}${note}`;
}
