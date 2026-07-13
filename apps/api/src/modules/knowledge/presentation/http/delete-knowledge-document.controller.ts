import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';

import { DeleteKnowledgeDocumentUseCase } from '../../application/delete-knowledge-document.use-case';

@Controller('knowledge-documents')
export class DeleteKnowledgeDocumentController {
  constructor(private readonly useCase: DeleteKnowledgeDocumentUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  execute(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
