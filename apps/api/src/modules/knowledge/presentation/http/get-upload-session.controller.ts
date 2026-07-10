import { Controller, Get, Param } from '@nestjs/common';

import type { UploadSessionSummary } from '../../domain/knowledge-upload';
import { GetUploadSessionUseCase } from '../../application/get-upload-session.use-case';

@Controller('uploads')
export class GetUploadSessionController {
  constructor(private readonly useCase: GetUploadSessionUseCase) {}

  @Get(':id')
  execute(@Param('id') id: string): Promise<UploadSessionSummary> {
    return this.useCase.execute(id);
  }
}
