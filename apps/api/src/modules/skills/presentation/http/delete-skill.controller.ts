import { Controller, Delete, HttpCode, Param } from '@nestjs/common';

import { DeleteSkillUseCase } from '../../application/delete-skill.use-case';

@Controller('skills')
export class DeleteSkillController {
  constructor(private readonly useCase: DeleteSkillUseCase) {}

  @Delete(':id')
  @HttpCode(204)
  execute(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
