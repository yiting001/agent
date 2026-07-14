export interface ChatAttachmentSummary {
  fileName: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ConversationMessage {
  attachments?: ChatAttachmentSummary[];
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
  conversationId?: string;
}
