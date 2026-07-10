import { Injectable } from '@nestjs/common';

import {
  type BrandSettingsSummary,
  summarizeBrandSettings,
} from '../domain/brand-settings';
import { BrandSettingsService } from './brand-settings.service';

@Injectable()
export class GetBrandSettingsUseCase {
  constructor(private readonly settingsService: BrandSettingsService) {}

  async execute(): Promise<BrandSettingsSummary> {
    return summarizeBrandSettings(await this.settingsService.get());
  }
}
