import { Body, Controller, Param, ParseUUIDPipe, Put } from '@nestjs/common';

import { UpdatePromptPolicyUseCase } from '../../application/update-prompt-policy.use-case';
import type { PromptPolicySummary } from '../../domain/prompt-policy';
import { UpdatePromptPolicyDto } from './update-prompt-policy.dto';

@Controller('prompt-policies')
export class UpdatePromptPolicyController {
  constructor(private readonly useCase: UpdatePromptPolicyUseCase) {}

  @Put(':id')
  execute(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdatePromptPolicyDto,
  ): Promise<PromptPolicySummary> {
    return this.useCase.execute({ ...body, id });
  }
}
