/** 根据文件类型将受限大小的文档转换为可切片纯文本。 */
export abstract class DocumentTextExtractor {
  abstract extract(fileName: string, content: Buffer): Promise<string>;
}
