import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BrandSettingsRepository } from '../application/brand-settings.repository';
import type { BrandSettings } from '../domain/brand-settings';
import { GLOBAL_BRAND_SETTINGS_ID } from '../domain/brand-settings';
import { BrandSettingsEntity } from './brand-settings.entity';

@Injectable()
export class TypeOrmBrandSettingsRepository extends BrandSettingsRepository {
  constructor(
    @InjectRepository(BrandSettingsEntity)
    private readonly repository: Repository<BrandSettingsEntity>,
  ) {
    super();
  }

  async find(): Promise<BrandSettings | undefined> {
    const entity = await this.repository.findOneBy({
      id: GLOBAL_BRAND_SETTINGS_ID,
    });

    return entity
      ? {
          createdAt: entity.createdAt,
          iconMimeType: entity.iconMimeType,
          iconStorageKey: entity.iconStorageKey,
          id: entity.id,
          softwareName: entity.softwareName,
          updatedAt: entity.updatedAt,
        }
      : undefined;
  }

  async save(settings: BrandSettings): Promise<void> {
    await this.repository.save(settings);
  }
}
