import { Controller, Get } from '@nestjs/common';

import { ListPromptPoliciesUseCase } from '../../application/list-prompt-policies.use-case';
import type { PromptPolicySummary } from '../../domain/prompt-policy';

@Controller('prompt-policies')
export class ListPromptPoliciesController {
  constructor(private readonly useCase: ListPromptPoliciesUseCase) {}

  @Get()
  execute(): Promise<PromptPolicySummary[]> {
    return this.useCase.execute();
  }
}
