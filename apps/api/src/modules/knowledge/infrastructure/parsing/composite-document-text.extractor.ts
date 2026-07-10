import { Injectable } from '@nestjs/common';
import { extname } from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

import { ApplicationError } from '../../../../shared/application/application-error';
import { DocumentTextExtractor } from '../../application/document-text-extractor';

function normalizeText(value: string): string {
  return value
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

@Injectable()
export class CompositeDocumentTextExtractor extends DocumentTextExtractor {
  async extract(fileName: string, content: Buffer): Promise<string> {
    const extension = extname(fileName).toLowerCase();

    if (extension === '.pdf') {
      return this.extractPdf(content);
    }

    if (extension === '.docx') {
      const result = await mammoth.extractRawText({ buffer: content });

      return normalizeText(result.value);
    }

    const decoded = content.toString('utf8');

    if (extension === '.htm' || extension === '.html') {
      return normalizeText(stripHtml(decoded));
    }

    if (['.csv', '.json', '.markdown', '.md', '.txt'].includes(extension)) {
      return normalizeText(decoded);
    }

    throw new ApplicationError('invalid_operation', '文档格式不受支持。');
  }

  private async extractPdf(content: Buffer): Promise<string> {
    const parser = new PDFParse({ data: content });

    try {
      const result = await parser.getText();

      return normalizeText(result.text);
    } finally {
      await parser.destroy();
    }
  }
}
