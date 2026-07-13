import { Controller, Get, Param } from '@nestjs/common';

import { ListModuleDocumentsUseCase } from '../../application/list-module-documents.use-case';
import type { KnowledgeDocumentSummary } from '../../domain/knowledge';

@Controller('knowledge-modules')
export class ListModuleDocumentsController {
  constructor(private readonly useCase: ListModuleDocumentsUseCase) {}

  @Get(':id/documents')
  execute(@Param('id') id: string): Promise<KnowledgeDocumentSummary[]> {
    return this.useCase.execute(id);
  }
}
