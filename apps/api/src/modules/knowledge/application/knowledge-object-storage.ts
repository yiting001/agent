export interface StoredObjectResult {
  sha256: string;
  sizeBytes: number;
}

export abstract class KnowledgeObjectStorage {
  abstract combine(
    targetKey: string,
    sourceKeys: string[],
  ): Promise<StoredObjectResult>;
  abstract deleteMany(keys: string[]): Promise<void>;
  abstract readBuffer(key: string, maxBytes: number): Promise<Buffer>;
  abstract write(
    key: string,
    source: AsyncIterable<Uint8Array>,
  ): Promise<StoredObjectResult>;
}
