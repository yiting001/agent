import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import {
  GLOBAL_BRAND_SETTINGS_ID,
  type BrandSettings,
} from '../domain/brand-settings';
import { BrandSettingsRepository } from './brand-settings.repository';

@Injectable()
export class BrandSettingsService {
  private readonly defaultSoftwareName: string;

  constructor(
    private readonly repository: BrandSettingsRepository,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.defaultSoftwareName = config.defaultSoftwareName;
  }

  async get(): Promise<BrandSettings> {
    const existing = await this.repository.find();

    if (existing) {
      return existing;
    }

    const initialDate = new Date(0);

    return {
      createdAt: initialDate,
      id: GLOBAL_BRAND_SETTINGS_ID,
      softwareName: this.defaultSoftwareName,
      updatedAt: initialDate,
    };
  }
}
