import type { ChatAttachmentSummary } from '../domain/chat';

export interface StoredChatAttachment extends ChatAttachmentSummary {
  content: Buffer;
}

export abstract class ChatAttachmentStorage {
  abstract delete(id: string): Promise<void>;
  abstract read(id: string): Promise<StoredChatAttachment>;
  abstract write(
    fileName: string,
    mimeType: string,
    source: AsyncIterable<Uint8Array>,
    maxBytes: number,
  ): Promise<ChatAttachmentSummary>;
}
