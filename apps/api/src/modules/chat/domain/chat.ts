/** 已上传且可附加到聊天消息的文件元数据。 */
export interface ChatAttachmentSummary {
  fileName: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
}

/** 进入模型上下文的规范化对话消息。 */
export interface ConversationMessage {
  /** 消息关联的多模态附件；模型不支持时由应用层降级。 */
  attachments?: ChatAttachmentSummary[];
  content: string;
  role: 'assistant' | 'user';
}

/** RAG 回答引用的知识文档片段来源。 */
export interface ChatCitation {
  documentId: string;
  fileName: string;
  moduleId: string;
  /** 向量检索相关度，数值越高代表越匹配。 */
  score: number;
}

/** 聊天用例对 HTTP、公开页和兼容 API 暴露的统一结果。 */
export interface AgentChatResponse {
  agentId: string;
  answer: string;
  citations: ChatCitation[];
  /** 开启记忆能力时返回的会话标识。 */
  conversationId?: string;
  generationId: string;
  traceId: string;
}
