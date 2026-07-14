/** 对象写入或合并后的完整性信息。 */
export interface StoredObjectResult {
  /** 最终对象内容的 SHA-256 摘要。 */
  sha256: string;
  sizeBytes: number;
}

/** 知识文档对象存储端口，业务层只持有内部 key。 */
export abstract class KnowledgeObjectStorage {
  /** 按 sourceKeys 顺序合并分片并返回最终摘要。 */
  abstract combine(
    targetKey: string,
    sourceKeys: string[],
  ): Promise<StoredObjectResult>;
  /** 幂等删除多个内部对象键。 */
  abstract deleteMany(keys: string[]): Promise<void>;
  /** 读取时强制执行最大字节限制。 */
  abstract readBuffer(key: string, maxBytes: number): Promise<Buffer>;
  /** 以流式输入写入，避免整文件驻留应用层内存。 */
  abstract write(
    key: string,
    source: AsyncIterable<Uint8Array>,
  ): Promise<StoredObjectResult>;
}
