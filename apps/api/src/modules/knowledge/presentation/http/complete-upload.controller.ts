import { Body, Controller, Param, Post } from '@nestjs/common';

import type { KnowledgeDocument } from '../../domain/knowledge';
import { CompleteUploadUseCase } from '../../application/complete-upload.use-case';
import { CompleteUploadDto } from './complete-upload.dto';

@Controller('uploads')
export class CompleteUploadController {
  constructor(private readonly useCase: CompleteUploadUseCase) {}

  @Post(':id/complete')
  execute(
    @Param('id') id: string,
    @Body() body: CompleteUploadDto,
  ): Promise<KnowledgeDocument> {
    return this.useCase.execute(id, body.sha256);
  }
}
