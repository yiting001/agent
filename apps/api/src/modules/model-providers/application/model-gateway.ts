export interface ChatMessageInput {
  content: string;
  role: 'assistant' | 'system' | 'user';
}

export interface ChatCompletionInput {
  apiKey: string;
  baseUrl: string;
  messages: ChatMessageInput[];
  model: string;
  temperature: number;
}

export interface EmbeddingInput {
  apiKey: string;
  baseUrl: string;
  dimensions: number;
  input: string[];
  model: string;
}

export abstract class ModelGateway {
  abstract chat(input: ChatCompletionInput): Promise<string>;
  abstract embed(input: EmbeddingInput): Promise<number[][]>;
  abstract verify(baseUrl: string, apiKey: string): Promise<void>;
}
