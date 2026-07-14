import type { ChatAttachmentSummary } from '../domain/chat';

/** 聊天附件所属的智能体和客户端隔离范围。 */
export interface ChatAttachmentOwner {
  agentId: string;
  ownerKey: string;
}

/** 包含二进制内容的内部附件对象。 */
export interface StoredChatAttachment extends ChatAttachmentSummary {
  content: Buffer;
  owner?: ChatAttachmentOwner;
}

/** 不加载二进制内容的附件巡检元数据。 */
export interface StoredChatAttachmentMetadata extends ChatAttachmentSummary {
  createdAt: Date;
  owner?: ChatAttachmentOwner;
}

/** 聊天多模态附件存储端口。 */
export abstract class ChatAttachmentStorage {
  /** 传入 owner 时必须同时校验 agentId 和 ownerKey。 */
  abstract delete(id: string, owner?: ChatAttachmentOwner): Promise<void>;
  abstract list(
    owner: ChatAttachmentOwner,
  ): Promise<StoredChatAttachmentMetadata[]>;
  abstract listOwnerScopes(): Promise<ChatAttachmentOwner[]>;
  /** 传入 owner 时禁止跨隔离范围读取。 */
  abstract read(
    id: string,
    owner?: ChatAttachmentOwner,
  ): Promise<StoredChatAttachment>;
  /** 流式写入并强制限制大小；返回值不得包含二进制或存储路径。 */
  abstract write(
    fileName: string,
    mimeType: string,
    source: AsyncIterable<Uint8Array>,
    maxBytes: number,
    owner?: ChatAttachmentOwner,
  ): Promise<ChatAttachmentSummary>;
}
