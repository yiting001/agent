import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { GetKnowledgeEntryUseCase } from '../../application/use-cases/get-knowledge-entry.use-case';
import type { KnowledgeEntry } from '../../domain/knowledge-entry';
import { KnowledgeEntryNotFoundFilter } from './knowledge-entry-not-found.filter';

@ApiTags('knowledge')
@Controller('knowledge-entries')
@UseFilters(KnowledgeEntryNotFoundFilter)
export class GetKnowledgeEntryController {
  constructor(private readonly getKnowledgeEntry: GetKnowledgeEntryUseCase) {}

  @Get(':id')
  @ApiOperation({ summary: 'Read one knowledge entry' })
  @ApiOkResponse({ description: 'The requested knowledge entry.' })
  @ApiNotFoundResponse({ description: 'The entry does not exist.' })
  get(@Param('id') id: string): Promise<KnowledgeEntry> {
    return this.getKnowledgeEntry.execute(id);
  }
}
