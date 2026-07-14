import type { Readable } from 'node:stream';

/** 品牌图标写入后的内部对象信息。 */
export interface StoredBrandIcon {
  sizeBytes: number;
  storageKey: string;
}

/** 品牌图标的内部对象存储端口。 */
export abstract class BrandIconStorage {
  /** 删除图标对象并允许重复调用。 */
  abstract delete(storageKey: string): Promise<void>;
  /** 以流读取内部 key 对应的图标。 */
  abstract read(storageKey: string): Promise<Readable>;
  /** 流式写入并强制限制最大字节数。 */
  abstract write(
    mimeType: string,
    source: AsyncIterable<Uint8Array>,
    maxBytes: number,
  ): Promise<StoredBrandIcon>;
}
