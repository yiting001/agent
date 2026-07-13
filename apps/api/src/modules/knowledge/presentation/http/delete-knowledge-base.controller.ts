import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';

import { DeleteKnowledgeBaseUseCase } from '../../application/delete-knowledge-base.use-case';

@Controller('knowledge-bases')
export class DeleteKnowledgeBaseController {
  constructor(private readonly useCase: DeleteKnowledgeBaseUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  execute(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
