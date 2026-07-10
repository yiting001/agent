import { Body, Controller, Param, Post } from '@nestjs/common';

import type { UploadSessionSummary } from '../../domain/knowledge-upload';
import { CreateUploadSessionUseCase } from '../../application/create-upload-session.use-case';
import { CreateUploadSessionDto } from './create-upload-session.dto';

@Controller('knowledge-modules')
export class CreateUploadSessionController {
  constructor(private readonly useCase: CreateUploadSessionUseCase) {}

  @Post(':moduleId/uploads')
  execute(
    @Param('moduleId') moduleId: string,
    @Body() body: CreateUploadSessionDto,
  ): Promise<UploadSessionSummary> {
    return this.useCase.execute({
      fileName: body.fileName,
      mimeType: body.mimeType,
      moduleId,
      totalBytes: body.totalBytes,
    });
  }
}
