import { Body, Controller, Param, Put } from '@nestjs/common';

import { UpdateKnowledgeBaseUseCase } from '../../application/update-knowledge-base.use-case';
import type { KnowledgeBaseSummary } from '../../domain/knowledge';
import { UpdateKnowledgeBaseDto } from './update-knowledge-base.dto';

@Controller('knowledge-bases')
export class UpdateKnowledgeBaseController {
  constructor(private readonly useCase: UpdateKnowledgeBaseUseCase) {}

  @Put(':id')
  execute(
    @Param('id') id: string,
    @Body() body: UpdateKnowledgeBaseDto,
  ): Promise<KnowledgeBaseSummary> {
    return this.useCase.execute({ ...body, id });
  }
}
