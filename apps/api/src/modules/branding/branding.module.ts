import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BrandIconStorage } from './application/brand-icon.storage';
import { BrandSettingsRepository } from './application/brand-settings.repository';
import { BrandSettingsService } from './application/brand-settings.service';
import { GetBrandIconUseCase } from './application/get-brand-icon.use-case';
import { GetBrandSettingsUseCase } from './application/get-brand-settings.use-case';
import { RemoveBrandIconUseCase } from './application/remove-brand-icon.use-case';
import { UpdateBrandIconUseCase } from './application/update-brand-icon.use-case';
import { UpdateBrandNameUseCase } from './application/update-brand-name.use-case';
import { BrandSettingsEntity } from './infrastructure/brand-settings.entity';
import { LocalBrandIconStorage } from './infrastructure/storage/local-brand-icon.storage';
import { TypeOrmBrandSettingsRepository } from './infrastructure/typeorm-brand-settings.repository';
import { GetBrandIconController } from './presentation/http/get-brand-icon.controller';
import { GetBrandSettingsController } from './presentation/http/get-brand-settings.controller';
import { RemoveBrandIconController } from './presentation/http/remove-brand-icon.controller';
import { UpdateBrandIconController } from './presentation/http/update-brand-icon.controller';
import { UpdateBrandNameController } from './presentation/http/update-brand-name.controller';

@Module({
  controllers: [
    GetBrandIconController,
    GetBrandSettingsController,
    RemoveBrandIconController,
    UpdateBrandIconController,
    UpdateBrandNameController,
  ],
  imports: [TypeOrmModule.forFeature([BrandSettingsEntity])],
  providers: [
    BrandSettingsService,
    GetBrandIconUseCase,
    GetBrandSettingsUseCase,
    RemoveBrandIconUseCase,
    UpdateBrandIconUseCase,
    UpdateBrandNameUseCase,
    {
      provide: BrandIconStorage,
      useClass: LocalBrandIconStorage,
    },
    {
      provide: BrandSettingsRepository,
      useClass: TypeOrmBrandSettingsRepository,
    },
  ],
})
export class BrandingModule {}
