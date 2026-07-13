export interface ChatTextContentPart {
  text: string;
  type: 'text';
}

export interface ChatImageContentPart {
  image_url: { url: string };
  type: 'image_url';
}

export interface ChatAudioContentPart {
  input_audio: {
    data: string;
    format: 'mp3' | 'wav';
  };
  type: 'input_audio';
}

export interface ChatMessageInput {
  content:
    | string
    | Array<ChatAudioContentPart | ChatImageContentPart | ChatTextContentPart>;
  role: 'assistant' | 'system' | 'user';
}

export interface ChatCompletionInput {
  apiKey: string;
  baseUrl: string;
  messages: ChatMessageInput[];
  model: string;
  temperature: number;
}

export interface ChatToolDefinition {
  function: {
    description: string;
    name: string;
    parameters: Record<string, unknown>;
  };
  type: 'function';
}

export interface ChatToolCall {
  /** 模型输出的 JSON 字符串参数。 */
  arguments: string;
  id: string;
  name: string;
}

export interface AssistantToolCallMessage {
  content: string;
  role: 'assistant';
  tool_calls: Array<{
    function: { arguments: string; name: string };
    id: string;
    type: 'function';
  }>;
}

export interface ToolResultMessage {
  content: string;
  role: 'tool';
  tool_call_id: string;
}

export type ToolLoopMessage =
  | AssistantToolCallMessage
  | ChatMessageInput
  | ToolResultMessage;

export interface ToolChatInput {
  apiKey: string;
  baseUrl: string;
  messages: ToolLoopMessage[];
  model: string;
  temperature: number;
  tools: ChatToolDefinition[];
}

export interface ToolChatResult {
  content: string;
  toolCalls: ChatToolCall[];
}

export interface EmbeddingInput {
  apiKey: string;
  baseUrl: string;
  dimensions?: number;
  input: string[];
  model: string;
}

export abstract class ModelGateway {
  abstract chat(input: ChatCompletionInput): Promise<string>;
  abstract chatWithTools(input: ToolChatInput): Promise<ToolChatResult>;
  abstract embed(input: EmbeddingInput): Promise<number[][]>;
  abstract streamChat(input: ChatCompletionInput): AsyncIterable<string>;
  abstract verify(baseUrl: string, apiKey: string): Promise<void>;
}
