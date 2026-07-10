export abstract class DocumentTextExtractor {
  abstract extract(fileName: string, content: Buffer): Promise<string>;
}
