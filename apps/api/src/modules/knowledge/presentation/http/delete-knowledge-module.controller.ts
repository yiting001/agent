import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';

import { DeleteKnowledgeModuleUseCase } from '../../application/delete-knowledge-module.use-case';

@Controller('knowledge-modules')
export class DeleteKnowledgeModuleController {
  constructor(private readonly useCase: DeleteKnowledgeModuleUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  execute(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
