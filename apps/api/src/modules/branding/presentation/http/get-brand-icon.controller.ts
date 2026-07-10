import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

import { GetBrandIconUseCase } from '../../application/get-brand-icon.use-case';

@Controller('branding')
export class GetBrandIconController {
  constructor(private readonly useCase: GetBrandIconUseCase) {}

  @Get('icon')
  async execute(
    @Query('v') version: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const icon = await this.useCase.execute();

    response.type(icon.mimeType);
    response.setHeader(
      'Cache-Control',
      version ? 'public, max-age=31536000, immutable' : 'no-cache',
    );

    return new StreamableFile(icon.source);
  }
}
