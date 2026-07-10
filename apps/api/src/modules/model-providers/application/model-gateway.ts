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

export interface EmbeddingInput {
  apiKey: string;
  baseUrl: string;
  dimensions?: number;
  input: string[];
  model: string;
}

export abstract class ModelGateway {
  abstract chat(input: ChatCompletionInput): Promise<string>;
  abstract embed(input: EmbeddingInput): Promise<number[][]>;
  abstract streamChat(input: ChatCompletionInput): AsyncIterable<string>;
  abstract verify(baseUrl: string, apiKey: string): Promise<void>;
}
