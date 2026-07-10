import { Body, Controller, Post } from '@nestjs/common';

import type { KnowledgeBaseSummary } from '../../domain/knowledge';
import { CreateKnowledgeBaseUseCase } from '../../application/create-knowledge-base.use-case';
import { CreateKnowledgeBaseDto } from './create-knowledge-base.dto';

@Controller('knowledge-bases')
export class CreateKnowledgeBaseController {
  constructor(private readonly useCase: CreateKnowledgeBaseUseCase) {}

  @Post()
  execute(@Body() body: CreateKnowledgeBaseDto): Promise<KnowledgeBaseSummary> {
    return this.useCase.execute(body);
  }
}
