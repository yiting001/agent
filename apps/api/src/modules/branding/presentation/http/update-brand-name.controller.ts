import { Body, Controller, Put } from '@nestjs/common';

import { UpdateBrandNameUseCase } from '../../application/update-brand-name.use-case';
import type { BrandSettingsSummary } from '../../domain/brand-settings';
import { UpdateBrandNameDto } from './update-brand-name.dto';

@Controller('branding')
export class UpdateBrandNameController {
  constructor(private readonly useCase: UpdateBrandNameUseCase) {}

  @Put()
  execute(@Body() body: UpdateBrandNameDto): Promise<BrandSettingsSummary> {
    return this.useCase.execute(body.softwareName);
  }
}
