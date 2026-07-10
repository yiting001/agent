import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';

import { ApplicationError } from '../../../shared/application/application-error';
import { BrandIconStorage } from './brand-icon.storage';
import { BrandSettingsService } from './brand-settings.service';

export interface BrandIconAsset {
  mimeType: string;
  source: Readable;
}

@Injectable()
export class GetBrandIconUseCase {
  constructor(
    private readonly settingsService: BrandSettingsService,
    private readonly storage: BrandIconStorage,
  ) {}

  async execute(): Promise<BrandIconAsset> {
    const settings = await this.settingsService.get();

    if (!settings.iconMimeType || !settings.iconStorageKey) {
      throw new ApplicationError('not_found', '尚未配置自定义软件图标。');
    }

    return {
      mimeType: settings.iconMimeType,
      source: await this.storage.read(settings.iconStorageKey),
    };
  }
}
