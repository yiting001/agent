import { Controller, Get } from '@nestjs/common';

import type { KnowledgeBaseSummary } from '../../domain/knowledge';
import { ListKnowledgeBasesUseCase } from '../../application/list-knowledge-bases.use-case';

@Controller('knowledge-bases')
export class ListKnowledgeBasesController {
  constructor(private readonly useCase: ListKnowledgeBasesUseCase) {}

  @Get()
  execute(): Promise<KnowledgeBaseSummary[]> {
    return this.useCase.execute();
  }
}
