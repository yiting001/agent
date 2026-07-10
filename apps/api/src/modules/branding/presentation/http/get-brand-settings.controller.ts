import { Controller, Get } from '@nestjs/common';

import { GetBrandSettingsUseCase } from '../../application/get-brand-settings.use-case';
import type { BrandSettingsSummary } from '../../domain/brand-settings';

@Controller('branding')
export class GetBrandSettingsController {
  constructor(private readonly useCase: GetBrandSettingsUseCase) {}

  @Get()
  execute(): Promise<BrandSettingsSummary> {
    return this.useCase.execute();
  }
}
