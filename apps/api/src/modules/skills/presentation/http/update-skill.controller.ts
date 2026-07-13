import { Body, Controller, Param, Put } from '@nestjs/common';

import type { SkillSummary } from '../../domain/skill';
import { UpdateSkillUseCase } from '../../application/update-skill.use-case';
import { UpdateSkillDto } from './update-skill.dto';

@Controller('skills')
export class UpdateSkillController {
  constructor(private readonly useCase: UpdateSkillUseCase) {}

  @Put(':id')
  execute(
    @Param('id') id: string,
    @Body() body: UpdateSkillDto,
  ): Promise<SkillSummary> {
    return this.useCase.execute({ ...body, id });
  }
}
