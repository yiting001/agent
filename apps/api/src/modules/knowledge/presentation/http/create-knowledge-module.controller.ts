import { Body, Controller, Param, Post } from '@nestjs/common';

import type { KnowledgeModuleSummary } from '../../domain/knowledge';
import { CreateKnowledgeModuleUseCase } from '../../application/create-knowledge-module.use-case';
import { CreateKnowledgeModuleDto } from './create-knowledge-module.dto';

@Controller('knowledge-bases')
export class CreateKnowledgeModuleController {
  constructor(private readonly useCase: CreateKnowledgeModuleUseCase) {}

  @Post(':knowledgeBaseId/modules')
  execute(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() body: CreateKnowledgeModuleDto,
  ): Promise<KnowledgeModuleSummary> {
    return this.useCase.execute({
      description: body.description,
      knowledgeBaseId,
      name: body.name,
    });
  }
}
