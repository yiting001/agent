import { Body, Controller, Post } from '@nestjs/common';

import type { SkillSummary } from '../../domain/skill';
import { InstallSkillUseCase } from '../../application/install-skill.use-case';
import { InstallSkillDto } from './install-skill.dto';

@Controller('skills')
export class InstallSkillController {
  constructor(private readonly useCase: InstallSkillUseCase) {}

  @Post()
  execute(@Body() body: InstallSkillDto): Promise<SkillSummary> {
    return this.useCase.execute(body);
  }
}
