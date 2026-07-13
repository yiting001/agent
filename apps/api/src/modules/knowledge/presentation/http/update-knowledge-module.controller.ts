import { Body, Controller, Param, Put } from '@nestjs/common';

import { UpdateKnowledgeModuleUseCase } from '../../application/update-knowledge-module.use-case';
import type { KnowledgeModuleSummary } from '../../domain/knowledge';
import { UpdateKnowledgeModuleDto } from './update-knowledge-module.dto';

@Controller('knowledge-modules')
export class UpdateKnowledgeModuleController {
  constructor(private readonly useCase: UpdateKnowledgeModuleUseCase) {}

  @Put(':id')
  execute(
    @Param('id') id: string,
    @Body() body: UpdateKnowledgeModuleDto,
  ): Promise<KnowledgeModuleSummary> {
    return this.useCase.execute({ ...body, id });
  }
}
