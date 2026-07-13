import { Controller, Get, Param } from '@nestjs/common';

import { GetKnowledgeDocumentContentUseCase } from '../../application/get-knowledge-document-content.use-case';
import type { KnowledgeDocumentContent } from '../../domain/knowledge';

@Controller('knowledge-documents')
export class GetKnowledgeDocumentContentController {
  constructor(private readonly useCase: GetKnowledgeDocumentContentUseCase) {}

  @Get(':id/content')
  execute(@Param('id') id: string): Promise<KnowledgeDocumentContent> {
    return this.useCase.execute(id);
  }
}
