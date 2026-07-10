import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createWriteStream, promises as fileSystem } from 'node:fs';
import { once } from 'node:events';
import { resolve, sep } from 'node:path';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import {
  ChatAttachmentStorage,
  type StoredChatAttachment,
} from '../application/chat-attachment.storage';
import type { ChatAttachmentSummary } from '../domain/chat';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function matchesSignature(mimeType: string, header: Buffer): boolean {
  if (mimeType === 'image/png') {
    return header
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === 'image/jpeg') {
    return header.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }

  if (mimeType === 'image/webp') {
    return (
      header.subarray(0, 4).toString('ascii') === 'RIFF' &&
      header.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  if (mimeType === 'image/gif') {
    return ['GIF87a', 'GIF89a'].includes(
      header.subarray(0, 6).toString('ascii'),
    );
  }

  if (mimeType === 'audio/mpeg') {
    return (
      header.subarray(0, 3).toString('ascii') === 'ID3' ||
      (header[0] === 0xff && ((header[1] ?? 0) & 0xe0) === 0xe0)
    );
  }

  return (
    header.subarray(0, 4).toString('ascii') === 'RIFF' &&
    header.subarray(8, 12).toString('ascii') === 'WAVE'
  );
}

function normalizeFileName(fileName: string): string {
  const value = [...fileName.trim()]
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replaceAll('/', '_')
    .replaceAll('\\', '_')
    .slice(0, 120);

  return value || '未命名附件';
}

function parseMetadata(value: string): ChatAttachmentSummary {
  const parsed: unknown = JSON.parse(value);

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    !('id' in parsed) ||
    !('fileName' in parsed) ||
    !('mimeType' in parsed) ||
    !('sizeBytes' in parsed) ||
    typeof parsed.id !== 'string' ||
    typeof parsed.fileName !== 'string' ||
    typeof parsed.mimeType !== 'string' ||
    typeof parsed.sizeBytes !== 'number'
  ) {
    throw new ApplicationError('not_found', '聊天附件元数据无效。');
  }

  return {
    fileName: parsed.fileName,
    id: parsed.id,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
  };
}

@Injectable()
export class LocalChatAttachmentStorage extends ChatAttachmentStorage {
  private readonly rootPath: string;

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.rootPath = resolve(config.chatAttachmentStoragePath);
  }

  async delete(id: string): Promise<void> {
    await Promise.all([
      fileSystem.rm(this.resolveKey(`${id}.bin`), { force: true }),
      fileSystem.rm(this.resolveKey(`${id}.json`), { force: true }),
    ]);
  }

  async read(id: string): Promise<StoredChatAttachment> {
    this.validateId(id);

    try {
      const [content, metadata] = await Promise.all([
        fileSystem.readFile(this.resolveKey(`${id}.bin`)),
        fileSystem.readFile(this.resolveKey(`${id}.json`), 'utf8'),
      ]);

      return { ...parseMetadata(metadata), content };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError('not_found', '聊天附件不存在或已失效。');
    }
  }

  async write(
    fileName: string,
    mimeType: string,
    source: AsyncIterable<Uint8Array>,
    maxBytes: number,
  ): Promise<ChatAttachmentSummary> {
    const id = randomUUID();
    const filePath = this.resolveKey(`${id}.bin`);

    await fileSystem.mkdir(this.rootPath, { recursive: true });

    const output = createWriteStream(filePath, { flags: 'wx' });
    let header = Buffer.alloc(0);
    let sizeBytes = 0;

    try {
      for await (const chunk of source) {
        const buffer = Buffer.from(chunk);

        sizeBytes += buffer.length;

        if (header.length < 12) {
          header = Buffer.concat([
            header,
            buffer.subarray(0, 12 - header.length),
          ]);
        }

        if (sizeBytes > maxBytes) {
          throw new ApplicationError('invalid_operation', '聊天附件过大。');
        }

        if (!output.write(buffer)) {
          await once(output, 'drain');
        }
      }

      output.end();
      await once(output, 'finish');

      if (!sizeBytes || !matchesSignature(mimeType, header)) {
        throw new ApplicationError(
          'invalid_operation',
          '附件内容与声明的文件格式不一致。',
        );
      }

      const metadata: ChatAttachmentSummary = {
        fileName: normalizeFileName(fileName),
        id,
        mimeType: mimeType === 'audio/x-wav' ? 'audio/wav' : mimeType,
        sizeBytes,
      };

      await fileSystem.writeFile(
        this.resolveKey(`${id}.json`),
        JSON.stringify(metadata),
        { flag: 'wx' },
      );

      return metadata;
    } catch (error) {
      output.destroy();
      await this.delete(id);
      throw error;
    }
  }

  private resolveKey(key: string): string {
    const path = resolve(this.rootPath, key);

    if (!path.startsWith(`${this.rootPath}${sep}`)) {
      throw new ApplicationError('invalid_operation', '聊天附件路径不合法。');
    }

    return path;
  }

  private validateId(id: string): void {
    if (!UUID_PATTERN.test(id)) {
      throw new ApplicationError('not_found', '聊天附件标识无效。');
    }
  }
}
