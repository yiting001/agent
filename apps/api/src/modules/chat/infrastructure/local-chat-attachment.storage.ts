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
  type ChatAttachmentOwner,
  type StoredChatAttachment,
  type StoredChatAttachmentMetadata,
} from '../application/chat-attachment.storage';
import type { ChatAttachmentSummary } from '../domain/chat';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 校验受支持图片和音频的魔数，不能只信任客户端 MIME。 */
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

/** 去除控制符和路径分隔符，文件名仅用于展示。 */
function normalizeFileName(fileName: string): string {
  const value = [...fileName.trim()]
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replaceAll('/', '_')
    .replaceAll('\\', '_')
    .slice(0, 120);

  return value || '未命名附件';
}

interface ChatAttachmentMetadata extends ChatAttachmentSummary {
  agentId?: string;
  createdAt?: string;
  ownerKey?: string;
}

/** 非法或缺失关键字段的 sidecar 元数据一律视为附件不存在。 */
function parseMetadata(value: string): ChatAttachmentMetadata {
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

  const metadata: ChatAttachmentMetadata = {
    createdAt:
      'createdAt' in parsed && typeof parsed.createdAt === 'string'
        ? parsed.createdAt
        : undefined,
    fileName: parsed.fileName,
    id: parsed.id,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
  };

  if (
    'agentId' in parsed &&
    'ownerKey' in parsed &&
    typeof parsed.agentId === 'string' &&
    typeof parsed.ownerKey === 'string'
  ) {
    metadata.agentId = parsed.agentId;
    metadata.ownerKey = parsed.ownerKey;
  }

  return metadata;
}

/** 已绑定 owner 的附件必须同时匹配 agentId 和 ownerKey。 */
function assertOwner(
  metadata: ChatAttachmentMetadata,
  owner?: ChatAttachmentOwner,
): void {
  const owned = Boolean(metadata.agentId && metadata.ownerKey);

  if (
    owned &&
    (!owner ||
      metadata.agentId !== owner.agentId ||
      metadata.ownerKey !== owner.ownerKey)
  ) {
    throw new ApplicationError('not_found', '聊天附件不存在或已失效。');
  }
}

/** 使用 UUID 文件名和 JSON sidecar 保存 owner 隔离的聊天附件。 */
@Injectable()
export class LocalChatAttachmentStorage extends ChatAttachmentStorage {
  private readonly rootPath: string;

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.rootPath = resolve(config.chatAttachmentStoragePath);
  }

  async delete(id: string, owner?: ChatAttachmentOwner): Promise<void> {
    if (owner) {
      let metadata: ChatAttachmentMetadata;

      try {
        metadata = parseMetadata(
          await fileSystem.readFile(this.resolveKey(`${id}.json`), 'utf8'),
        );
      } catch {
        throw new ApplicationError('not_found', '聊天附件不存在或已失效。');
      }

      if (
        metadata.agentId !== owner.agentId ||
        metadata.ownerKey !== owner.ownerKey
      ) {
        throw new ApplicationError('not_found', '聊天附件不存在或已失效。');
      }
    }

    await Promise.all([
      fileSystem.rm(this.resolveKey(`${id}.bin`), { force: true }),
      fileSystem.rm(this.resolveKey(`${id}.json`), { force: true }),
    ]);
  }

  async list(
    owner: ChatAttachmentOwner,
  ): Promise<StoredChatAttachmentMetadata[]> {
    let names: string[];

    try {
      names = await fileSystem.readdir(this.rootPath);
    } catch {
      return [];
    }

    const results: StoredChatAttachmentMetadata[] = [];

    for (const name of names.filter((value) => value.endsWith('.json'))) {
      try {
        const path = this.resolveKey(name);
        const [content, statistics] = await Promise.all([
          fileSystem.readFile(path, 'utf8'),
          fileSystem.stat(path),
        ]);
        const metadata = parseMetadata(content);

        if (
          metadata.agentId === owner.agentId &&
          metadata.ownerKey === owner.ownerKey
        ) {
          results.push({
            createdAt: metadata.createdAt
              ? new Date(metadata.createdAt)
              : statistics.mtime,
            fileName: metadata.fileName,
            id: metadata.id,
            mimeType: metadata.mimeType,
            owner,
            sizeBytes: metadata.sizeBytes,
          });
        }
      } catch {
        continue;
      }
    }

    return results;
  }

  async listOwnerScopes(): Promise<ChatAttachmentOwner[]> {
    let names: string[];

    try {
      names = await fileSystem.readdir(this.rootPath);
    } catch {
      return [];
    }

    const scopes = new Map<string, ChatAttachmentOwner>();

    for (const name of names.filter((value) => value.endsWith('.json'))) {
      try {
        const metadata = parseMetadata(
          await fileSystem.readFile(this.resolveKey(name), 'utf8'),
        );

        if (metadata.agentId && metadata.ownerKey) {
          scopes.set(`${metadata.agentId}\u0000${metadata.ownerKey}`, {
            agentId: metadata.agentId,
            ownerKey: metadata.ownerKey,
          });
        }
      } catch {
        continue;
      }
    }

    return [...scopes.values()];
  }

  async read(
    id: string,
    owner?: ChatAttachmentOwner,
  ): Promise<StoredChatAttachment> {
    this.validateId(id);

    try {
      const [content, metadata] = await Promise.all([
        fileSystem.readFile(this.resolveKey(`${id}.bin`)),
        fileSystem.readFile(this.resolveKey(`${id}.json`), 'utf8'),
      ]);
      const parsed = parseMetadata(metadata);

      assertOwner(parsed, owner);

      return {
        content,
        fileName: parsed.fileName,
        id: parsed.id,
        mimeType: parsed.mimeType,
        owner:
          parsed.agentId && parsed.ownerKey
            ? { agentId: parsed.agentId, ownerKey: parsed.ownerKey }
            : undefined,
        sizeBytes: parsed.sizeBytes,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError('not_found', '聊天附件不存在或已失效。');
    }
  }

  /** 流式写入时限制大小、校验魔数，失败后删除部分文件。 */
  async write(
    fileName: string,
    mimeType: string,
    source: AsyncIterable<Uint8Array>,
    maxBytes: number,
    owner?: ChatAttachmentOwner,
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

      const metadata: ChatAttachmentMetadata = {
        agentId: owner?.agentId,
        createdAt: new Date().toISOString(),
        fileName: normalizeFileName(fileName),
        id,
        mimeType: mimeType === 'audio/x-wav' ? 'audio/wav' : mimeType,
        ownerKey: owner?.ownerKey,
        sizeBytes,
      };

      await fileSystem.writeFile(
        this.resolveKey(`${id}.json`),
        JSON.stringify(metadata),
        { flag: 'wx' },
      );

      return {
        fileName: metadata.fileName,
        id: metadata.id,
        mimeType: metadata.mimeType,
        sizeBytes: metadata.sizeBytes,
      };
    } catch (error) {
      output.destroy();
      await this.delete(id);
      throw error;
    }
  }

  /** 解析后确认最终路径仍位于配置根目录内，阻止目录穿越。 */
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
