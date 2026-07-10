import { Injectable } from '@nestjs/common';

import {
  type BrandSettingsSummary,
  summarizeBrandSettings,
} from '../domain/brand-settings';
import { BrandIconStorage } from './brand-icon.storage';
import { BrandSettingsRepository } from './brand-settings.repository';
import { BrandSettingsService } from './brand-settings.service';

@Injectable()
export class RemoveBrandIconUseCase {
  constructor(
    private readonly repository: BrandSettingsRepository,
    private readonly settingsService: BrandSettingsService,
    private readonly storage: BrandIconStorage,
  ) {}

  async execute(): Promise<BrandSettingsSummary> {
    const current = await this.settingsService.get();

    if (!current.iconStorageKey) {
      return summarizeBrandSettings(current);
    }

    const storageKey = current.iconStorageKey;
    const updated = {
      ...current,
      iconMimeType: undefined,
      iconStorageKey: undefined,
      updatedAt: new Date(),
    };

    await this.repository.save(updated);
    await this.storage.delete(storageKey);

    return summarizeBrandSettings(updated);
  }
}
