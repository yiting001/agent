import { Body, Controller, Param, Put, UseFilters } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { UpdateKnowledgeEntryUseCase } from '../../application/use-cases/update-knowledge-entry.use-case';
import type { KnowledgeEntry } from '../../domain/knowledge-entry';
import { UpdateKnowledgeEntryDto } from './dto/update-knowledge-entry.dto';
import { KnowledgeEntryNotFoundFilter } from './knowledge-entry-not-found.filter';

@ApiTags('knowledge')
@Controller('knowledge-entries')
@UseFilters(KnowledgeEntryNotFoundFilter)
export class UpdateKnowledgeEntryController {
  constructor(
    private readonly updateKnowledgeEntry: UpdateKnowledgeEntryUseCase,
  ) {}

  @Put(':id')
  @ApiOperation({ summary: 'Edit a knowledge entry' })
  @ApiOkResponse({ description: 'The updated knowledge entry.' })
  @ApiNotFoundResponse({ description: 'The entry does not exist.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeEntryDto,
  ): Promise<KnowledgeEntry> {
    return this.updateKnowledgeEntry.execute(id, dto);
  }
}
