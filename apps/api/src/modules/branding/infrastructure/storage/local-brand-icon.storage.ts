import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  createReadStream,
  createWriteStream,
  promises as fileSystem,
} from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { once } from 'node:events';
import type { Readable } from 'node:stream';

import type { ApplicationConfig } from '../../../../config/application.config';
import { ApplicationError } from '../../../../shared/application/application-error';
import {
  BrandIconStorage,
  type StoredBrandIcon,
} from '../../application/brand-icon.storage';

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/vnd.microsoft.icon': 'ico',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
};

function matchesMimeTypeSignature(mimeType: string, header: Buffer): boolean {
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

  return header.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]));
}

@Injectable()
export class LocalBrandIconStorage extends BrandIconStorage {
  private readonly rootPath: string;

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.rootPath = resolve(config.brandStoragePath);
  }

  async delete(storageKey: string): Promise<void> {
    await fileSystem.rm(this.resolveKey(storageKey), { force: true });
  }

  async read(storageKey: string): Promise<Readable> {
    const path = this.resolveKey(storageKey);

    try {
      await fileSystem.access(path);
    } catch {
      throw new ApplicationError('not_found', '软件图标文件不存在。');
    }

    return createReadStream(path);
  }

  async write(
    mimeType: string,
    source: AsyncIterable<Uint8Array>,
    maxBytes: number,
  ): Promise<StoredBrandIcon> {
    const extension = MIME_TYPE_EXTENSIONS[mimeType];

    if (!extension) {
      throw new ApplicationError('invalid_operation', '图标格式不受支持。');
    }

    const storageKey = `icons/${randomUUID()}.${extension}`;
    const targetPath = this.resolveKey(storageKey);

    await fileSystem.mkdir(dirname(targetPath), { recursive: true });

    const output = createWriteStream(targetPath, { flags: 'wx' });
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
          throw new ApplicationError(
            'invalid_operation',
            '图标文件超过允许的大小。',
          );
        }

        if (!output.write(buffer)) {
          await once(output, 'drain');
        }
      }

      output.end();
      await once(output, 'finish');
    } catch (error) {
      output.destroy();
      await fileSystem.rm(targetPath, { force: true });
      throw error;
    }

    if (sizeBytes === 0) {
      await fileSystem.rm(targetPath, { force: true });
      throw new ApplicationError('invalid_operation', '图标文件不能为空。');
    }

    if (!matchesMimeTypeSignature(mimeType, header)) {
      await fileSystem.rm(targetPath, { force: true });
      throw new ApplicationError(
        'invalid_operation',
        '图标内容与声明的文件格式不一致。',
      );
    }

    return { sizeBytes, storageKey };
  }

  private resolveKey(storageKey: string): string {
    const path = resolve(this.rootPath, storageKey);
    const rootPrefix = `${this.rootPath}${sep}`;

    if (!path.startsWith(rootPrefix)) {
      throw new ApplicationError('invalid_operation', '图标存储键不合法。');
    }

    return path;
  }
}
