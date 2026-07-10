export interface ConversationMessage {
  content: string;
  role: 'assistant' | 'user';
}

export interface ChatCitation {
  documentId: string;
  fileName: string;
  moduleId: string;
  score: number;
}

export interface AgentChatResponse {
  agentId: string;
  answer: string;
  citations: ChatCitation[];
}
