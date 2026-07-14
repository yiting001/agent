import type { ChatAttachmentSummary } from '../domain/chat';

export interface ChatAttachmentOwner {
  agentId: string;
  ownerKey: string;
}

export interface StoredChatAttachment extends ChatAttachmentSummary {
  content: Buffer;
  owner?: ChatAttachmentOwner;
}

export interface StoredChatAttachmentMetadata extends ChatAttachmentSummary {
  createdAt: Date;
  owner?: ChatAttachmentOwner;
}

export abstract class ChatAttachmentStorage {
  abstract delete(id: string, owner?: ChatAttachmentOwner): Promise<void>;
  abstract list(
    owner: ChatAttachmentOwner,
  ): Promise<StoredChatAttachmentMetadata[]>;
  abstract listOwnerScopes(): Promise<ChatAttachmentOwner[]>;
  abstract read(
    id: string,
    owner?: ChatAttachmentOwner,
  ): Promise<StoredChatAttachment>;
  abstract write(
    fileName: string,
    mimeType: string,
    source: AsyncIterable<Uint8Array>,
    maxBytes: number,
    owner?: ChatAttachmentOwner,
  ): Promise<ChatAttachmentSummary>;
}
