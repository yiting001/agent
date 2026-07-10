import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import {
  type BrandSettingsSummary,
  summarizeBrandSettings,
} from '../domain/brand-settings';
import { BrandIconStorage } from './brand-icon.storage';
import { BrandSettingsRepository } from './brand-settings.repository';
import { BrandSettingsService } from './brand-settings.service';

const SUPPORTED_ICON_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/vnd.microsoft.icon',
  'image/webp',
  'image/x-icon',
]);

@Injectable()
export class UpdateBrandIconUseCase {
  private readonly maxBytes: number;

  constructor(
    private readonly repository: BrandSettingsRepository,
    private readonly settingsService: BrandSettingsService,
    private readonly storage: BrandIconStorage,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.maxBytes = config.brandIconMaxBytes;
  }

  async execute(
    mimeType: string,
    contentLength: number,
    source: AsyncIterable<Uint8Array>,
  ): Promise<BrandSettingsSummary> {
    if (!SUPPORTED_ICON_MIME_TYPES.has(mimeType)) {
      throw new ApplicationError(
        'invalid_operation',
        '图标仅支持 PNG、JPG、WebP 或 ICO 格式。',
      );
    }

    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength < 1 ||
      contentLength > this.maxBytes
    ) {
      throw new ApplicationError(
        'invalid_operation',
        `图标大小必须在 1 字节到 ${this.maxBytes} 字节之间。`,
      );
    }

    const current = await this.settingsService.get();
    const stored = await this.storage.write(mimeType, source, this.maxBytes);

    if (stored.sizeBytes !== contentLength) {
      await this.storage.delete(stored.storageKey);
      throw new ApplicationError(
        'invalid_operation',
        '图标实际大小与 Content-Length 不一致。',
      );
    }

    const now = new Date();
    const updated = {
      ...current,
      createdAt: current.createdAt.getTime() === 0 ? now : current.createdAt,
      iconMimeType: mimeType,
      iconStorageKey: stored.storageKey,
      updatedAt: now,
    };

    try {
      await this.repository.save(updated);
    } catch (error) {
      await this.storage.delete(stored.storageKey);
      throw error;
    }

    if (current.iconStorageKey) {
      await this.storage.delete(current.iconStorageKey);
    }

    return summarizeBrandSettings(updated);
  }
}
