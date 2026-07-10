import { Controller, Delete } from '@nestjs/common';

import { RemoveBrandIconUseCase } from '../../application/remove-brand-icon.use-case';
import type { BrandSettingsSummary } from '../../domain/brand-settings';

@Controller('branding')
export class RemoveBrandIconController {
  constructor(private readonly useCase: RemoveBrandIconUseCase) {}

  @Delete('icon')
  execute(): Promise<BrandSettingsSummary> {
    return this.useCase.execute();
  }
}
