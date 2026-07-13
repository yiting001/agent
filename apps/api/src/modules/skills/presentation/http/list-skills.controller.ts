import { Controller, Get } from '@nestjs/common';

import type { SkillSummary } from '../../domain/skill';
import { ListSkillsUseCase } from '../../application/list-skills.use-case';

@Controller('skills')
export class ListSkillsController {
  constructor(private readonly useCase: ListSkillsUseCase) {}

  @Get()
  execute(): Promise<SkillSummary[]> {
    return this.useCase.execute();
  }
}
