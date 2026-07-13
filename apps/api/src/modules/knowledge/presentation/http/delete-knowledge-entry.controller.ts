import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  UseFilters,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { DeleteKnowledgeEntryUseCase } from '../../application/use-cases/delete-knowledge-entry.use-case';
import { KnowledgeEntryNotFoundFilter } from './knowledge-entry-not-found.filter';

@ApiTags('knowledge')
@Controller('knowledge-entries')
@UseFilters(KnowledgeEntryNotFoundFilter)
export class DeleteKnowledgeEntryController {
  constructor(
    private readonly deleteKnowledgeEntry: DeleteKnowledgeEntryUseCase,
  ) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a knowledge entry' })
  @ApiNoContentResponse({ description: 'The entry was removed.' })
  @ApiNotFoundResponse({ description: 'The entry does not exist.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.deleteKnowledgeEntry.execute(id);
  }
}
