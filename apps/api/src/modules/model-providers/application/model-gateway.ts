/** 模型兼容协议中的文本内容片段。 */
export interface ChatTextContentPart {
  text: string;
  type: 'text';
}

/** 模型兼容协议中的图片 URL 或 data URL 片段。 */
export interface ChatImageContentPart {
  image_url: { url: string };
  type: 'image_url';
}

/** 模型兼容协议中的 base64 音频片段。 */
export interface ChatAudioContentPart {
  input_audio: {
    data: string;
    format: 'mp3' | 'wav';
  };
  type: 'input_audio';
}

/** 统一到模型兼容协议的消息输入。 */
export interface ChatMessageInput {
  content:
    | string
    | Array<ChatAudioContentPart | ChatImageContentPart | ChatTextContentPart>;
  role: 'assistant' | 'system' | 'user';
}

/** 模型调用观测所需的非敏感计费和关联信息。 */
export interface ModelCallTelemetry {
  generationId?: string;
  inputCostPerMillionTokens?: number;
  /** 仅允许低基数、非敏感值。 */
  metadata?: Record<string, string | number | boolean>;
  operation?: string;
  outputCostPerMillionTokens?: number;
  providerId?: string;
  providerName?: string;
  traceId?: string;
}

/** 普通聊天或流式聊天的模型调用输入。 */
export interface ChatCompletionInput extends ModelCallTelemetry {
  /** 只供适配器发起请求使用，禁止记录或向上返回。 */
  apiKey: string;
  baseUrl: string;
  messages: ChatMessageInput[];
  model: string;
  temperature: number;
}

/** 暴露给模型的单个函数工具定义。 */
export interface ChatToolDefinition {
  function: {
    description: string;
    name: string;
    parameters: Record<string, unknown>;
  };
  type: 'function';
}

/** 模型请求执行的工具调用。 */
export interface ChatToolCall {
  /** 模型输出的 JSON 字符串参数。 */
  arguments: string;
  id: string;
  name: string;
}

/** 将模型工具调用追加回上下文的 assistant 消息。 */
export interface AssistantToolCallMessage {
  content: string;
  role: 'assistant';
  tool_calls: Array<{
    function: { arguments: string; name: string };
    id: string;
    type: 'function';
  }>;
}

/** 将工具执行结果追加回上下文的 tool 消息。 */
export interface ToolResultMessage {
  content: string;
  role: 'tool';
  tool_call_id: string;
}

/** 工具循环允许追加的消息联合类型。 */
export type ToolLoopMessage =
  | AssistantToolCallMessage
  | ChatMessageInput
  | ToolResultMessage;

/** 支持函数工具的聊天调用输入。 */
export interface ToolChatInput extends ModelCallTelemetry {
  apiKey: string;
  baseUrl: string;
  messages: ToolLoopMessage[];
  model: string;
  temperature: number;
  tools: ChatToolDefinition[];
}

/** 一轮工具聊天的文本与待执行工具集合。 */
export interface ToolChatResult {
  content: string;
  toolCalls: ChatToolCall[];
}

/** 批量文本嵌入调用输入。 */
export interface EmbeddingInput extends ModelCallTelemetry {
  apiKey: string;
  baseUrl: string;
  dimensions?: number;
  input: string[];
  model: string;
}

/** 隔离上游模型协议和 SDK 的应用层端口。 */
export abstract class ModelGateway {
  /** 返回完整文本回答。 */
  abstract chat(input: ChatCompletionInput): Promise<string>;
  /** 返回文本以及结构化工具调用。 */
  abstract chatWithTools(input: ToolChatInput): Promise<ToolChatResult>;
  /** 按输入顺序返回等长向量集合。 */
  abstract embed(input: EmbeddingInput): Promise<number[][]>;
  /** 按上游到达顺序产出文本增量。 */
  abstract streamChat(input: ChatCompletionInput): AsyncIterable<string>;
  /** 以最小请求验证地址和凭证可用性。 */
  abstract verify(baseUrl: string, apiKey: string): Promise<void>;
}
