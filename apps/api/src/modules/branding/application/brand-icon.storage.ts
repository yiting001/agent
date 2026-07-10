import type { Readable } from 'node:stream';

export interface StoredBrandIcon {
  sizeBytes: number;
  storageKey: string;
}

export abstract class BrandIconStorage {
  abstract delete(storageKey: string): Promise<void>;
  abstract read(storageKey: string): Promise<Readable>;
  abstract write(
    mimeType: string,
    source: AsyncIterable<Uint8Array>,
    maxBytes: number,
  ): Promise<StoredBrandIcon>;
}
