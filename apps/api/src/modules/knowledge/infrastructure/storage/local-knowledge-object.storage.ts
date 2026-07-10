import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import {
  createReadStream,
  createWriteStream,
  promises as fileSystem,
} from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { once } from 'node:events';

import type { ApplicationConfig } from '../../../../config/application.config';
import { ApplicationError } from '../../../../shared/application/application-error';
import {
  KnowledgeObjectStorage,
  type StoredObjectResult,
} from '../../application/knowledge-object-storage';

@Injectable()
export class LocalKnowledgeObjectStorage extends KnowledgeObjectStorage {
  private readonly rootPath: string;

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.rootPath = resolve(config.knowledgeStoragePath);
  }

  async combine(
    targetKey: string,
    sourceKeys: string[],
  ): Promise<StoredObjectResult> {
    const targetPath = this.resolveKey(targetKey);

    await fileSystem.mkdir(dirname(targetPath), { recursive: true });

    const output = createWriteStream(targetPath, { flags: 'wx' });
    const hash = createHash('sha256');
    let sizeBytes = 0;

    try {
      for (const sourceKey of sourceKeys) {
        for await (const chunk of createReadStream(
          this.resolveKey(sourceKey),
        )) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

          hash.update(buffer);
          sizeBytes += buffer.length;

          if (!output.write(buffer)) {
            await once(output, 'drain');
          }
        }
      }

      output.end();
      await once(output, 'finish');
    } catch (error) {
      output.destroy();
      await fileSystem.rm(targetPath, { force: true });
      throw error;
    }

    return {
      sha256: hash.digest('hex'),
      sizeBytes,
    };
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((key) => fileSystem.rm(this.resolveKey(key), { force: true })),
    );
  }

  async readBuffer(key: string, maxBytes: number): Promise<Buffer> {
    const path = this.resolveKey(key);
    const statistics = await fileSystem.stat(path);

    if (statistics.size > maxBytes) {
      throw new ApplicationError(
        'invalid_operation',
        '文档超过当前解析器允许的单文件大小。',
      );
    }

    return fileSystem.readFile(path);
  }

  async write(
    key: string,
    source: AsyncIterable<Uint8Array>,
  ): Promise<StoredObjectResult> {
    const targetPath = this.resolveKey(key);

    await fileSystem.mkdir(dirname(targetPath), { recursive: true });

    const output = createWriteStream(targetPath, { flags: 'wx' });
    const hash = createHash('sha256');
    let sizeBytes = 0;

    try {
      for await (const chunk of source) {
        const buffer = Buffer.from(chunk);

        hash.update(buffer);
        sizeBytes += buffer.length;

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

    return {
      sha256: hash.digest('hex'),
      sizeBytes,
    };
  }

  private resolveKey(key: string): string {
    const path = resolve(this.rootPath, key);
    const rootPrefix = `${this.rootPath}${sep}`;

    if (!path.startsWith(rootPrefix)) {
      throw new ApplicationError('invalid_operation', '存储键不合法。');
    }

    return path;
  }
}
