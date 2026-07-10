import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import {
  type BrandSettingsSummary,
  summarizeBrandSettings,
} from '../domain/brand-settings';
import { BrandSettingsRepository } from './brand-settings.repository';
import { BrandSettingsService } from './brand-settings.service';

@Injectable()
export class UpdateBrandNameUseCase {
  constructor(
    private readonly repository: BrandSettingsRepository,
    private readonly settingsService: BrandSettingsService,
  ) {}

  async execute(softwareName: string): Promise<BrandSettingsSummary> {
    const normalizedName = softwareName.trim();

    if (normalizedName.length < 2) {
      throw new ApplicationError(
        'invalid_operation',
        '软件名称至少需要两个字符。',
      );
    }

    const current = await this.settingsService.get();
    const now = new Date();
    const updated = {
      ...current,
      createdAt: current.createdAt.getTime() === 0 ? now : current.createdAt,
      softwareName: normalizedName,
      updatedAt: now,
    };

    await this.repository.save(updated);

    return summarizeBrandSettings(updated);
  }
}
