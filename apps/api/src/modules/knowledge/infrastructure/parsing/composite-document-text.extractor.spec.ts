import { ApplicationError } from '../../../../shared/application/application-error';
import { CompositeDocumentTextExtractor } from './composite-document-text.extractor';

describe('CompositeDocumentTextExtractor', () => {
  const extractor = new CompositeDocumentTextExtractor();

  it('normalizes plain text content', async () => {
    await expect(
      extractor.extract('资料.txt', Buffer.from('第一行  \r\n\r\n\r\n第二行')),
    ).resolves.toBe('第一行\n\n第二行');
  });

  it('removes executable and style content from HTML', async () => {
    const html =
      '<style>.x{color:red}</style><h1>标题</h1><script>alert(1)</script><p>正文</p>';
    const result = await extractor.extract('网页.html', Buffer.from(html));

    expect(result).toContain('标题');
    expect(result).toContain('正文');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('color');
  });

  it('rejects unsupported legacy document formats', async () => {
    await expect(
      extractor.extract('旧文档.doc', Buffer.from('content')),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
