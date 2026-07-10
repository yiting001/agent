import { Controller, Headers, Put, Req } from '@nestjs/common';
import type { Request } from 'express';

import { UpdateBrandIconUseCase } from '../../application/update-brand-icon.use-case';
import type { BrandSettingsSummary } from '../../domain/brand-settings';

@Controller('branding')
export class UpdateBrandIconController {
  constructor(private readonly useCase: UpdateBrandIconUseCase) {}

  @Put('icon')
  execute(
    @Headers('content-type') contentType: string,
    @Headers('content-length') contentLength: string,
    @Req() request: Request,
  ): Promise<BrandSettingsSummary> {
    return this.useCase.execute(
      contentType.split(';')[0]?.trim().toLowerCase() ?? '',
      Number(contentLength),
      request,
    );
  }
}
