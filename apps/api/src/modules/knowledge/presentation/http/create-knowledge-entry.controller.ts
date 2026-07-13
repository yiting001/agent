import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateKnowledgeEntryUseCase } from '../../application/use-cases/create-knowledge-entry.use-case';
import type { KnowledgeEntry } from '../../domain/knowledge-entry';
import { CreateKnowledgeEntryDto } from './dto/create-knowledge-entry.dto';

@ApiTags('knowledge')
@Controller('knowledge-entries')
export class CreateKnowledgeEntryController {
  constructor(
    private readonly createKnowledgeEntry: CreateKnowledgeEntryUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a knowledge entry' })
  @ApiCreatedResponse({ description: 'The stored knowledge entry.' })
  create(@Body() dto: CreateKnowledgeEntryDto): Promise<KnowledgeEntry> {
    return this.createKnowledgeEntry.execute(dto);
  }
}
