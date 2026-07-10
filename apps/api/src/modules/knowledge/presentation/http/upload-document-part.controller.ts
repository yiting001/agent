import {
  Controller,
  Headers,
  Param,
  ParseIntPipe,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import type { UploadedPartResult } from '../../application/upload-document-part.use-case';
import { UploadDocumentPartUseCase } from '../../application/upload-document-part.use-case';

@Controller('uploads')
export class UploadDocumentPartController {
  constructor(private readonly useCase: UploadDocumentPartUseCase) {}

  @Put(':id/parts/:partNumber')
  execute(
    @Param('id') uploadSessionId: string,
    @Param('partNumber', ParseIntPipe) partNumber: number,
    @Headers('content-length') contentLength: string,
    @Headers('x-chunk-sha256') expectedSha256: string | undefined,
    @Req() request: Request,
  ): Promise<UploadedPartResult> {
    return this.useCase.execute({
      contentLength: Number(contentLength),
      expectedSha256,
      partNumber,
      source: request,
      uploadSessionId,
    });
  }
}
