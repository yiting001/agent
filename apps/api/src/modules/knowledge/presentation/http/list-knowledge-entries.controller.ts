import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ListKnowledgeEntriesUseCase } from '../../application/use-cases/list-knowledge-entries.use-case';
import type { KnowledgeEntry } from '../../domain/knowledge-entry';

@ApiTags('knowledge')
@Controller('knowledge-entries')
export class ListKnowledgeEntriesController {
  constructor(
    private readonly listKnowledgeEntries: ListKnowledgeEntriesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all knowledge entries' })
  @ApiOkResponse({ description: 'Entries ordered by latest update.' })
  list(): Promise<KnowledgeEntry[]> {
    return this.listKnowledgeEntries.execute();
  }
}
