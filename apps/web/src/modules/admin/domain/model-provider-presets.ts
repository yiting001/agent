/** 常见模型服务商预设：按服务地址或标识匹配，用于自动建议嵌入模型。 */
export interface ModelProviderPreset {
  /** 推荐的嵌入模型；null 表示该服务商不提供嵌入模型。 */
  embeddingModel: string | null;
  hosts: string[];
  keys: string[];
  name: string;
}

const PRESETS: ModelProviderPreset[] = [
  {
    embeddingModel: null,
    hosts: ['api.deepseek.com'],
    keys: ['deepseek', 'ds'],
    name: 'DeepSeek',
  },
  {
    embeddingModel: 'text-embedding-3-small',
    hosts: ['api.openai.com'],
    keys: ['openai'],
    name: 'OpenAI',
  },
  {
    embeddingModel: 'text-embedding-v3',
    hosts: ['dashscope.aliyuncs.com'],
    keys: ['qwen', 'tongyi', 'dashscope', 'aliyun'],
    name: '通义千问',
  },
  {
    embeddingModel: 'embedding-3',
    hosts: ['open.bigmodel.cn'],
    keys: ['zhipu', 'glm', 'bigmodel'],
    name: '智谱 GLM',
  },
  {
    embeddingModel: 'doubao-embedding',
    hosts: ['ark.cn-beijing.volces.com'],
    keys: ['doubao', 'volc', 'ark'],
    name: '豆包（火山方舟）',
  },
  {
    embeddingModel: 'Baichuan-Text-Embedding',
    hosts: ['api.baichuan-ai.com'],
    keys: ['baichuan'],
    name: '百川',
  },
  {
    embeddingModel: null,
    hosts: ['api.moonshot.cn'],
    keys: ['moonshot', 'kimi'],
    name: 'Moonshot (Kimi)',
  },
  {
    embeddingModel: 'BAAI/bge-m3',
    hosts: ['api.siliconflow.cn'],
    keys: ['siliconflow', 'sf'],
    name: '硅基流动',
  },
];

/** 根据服务地址或服务标识匹配预设；匹配不到返回 undefined。 */
export function matchModelProviderPreset(
  baseUrl: string,
  key: string,
): ModelProviderPreset | undefined {
  const host = extractHost(baseUrl);
  const normalizedKey = key.trim().toLowerCase();

  return PRESETS.find(
    (preset) =>
      (host && preset.hosts.some((candidate) => host.includes(candidate))) ||
      (normalizedKey && preset.keys.includes(normalizedKey)),
  );
}

function extractHost(baseUrl: string): string {
  try {
    return new URL(baseUrl.trim()).host.toLowerCase();
  } catch {
    return '';
  }
}
