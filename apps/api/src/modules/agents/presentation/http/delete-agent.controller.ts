import { Controller, Delete, Param } from '@nestjs/common';

import {
  DeleteAgentUseCase,
  type DeleteAgentResult,
} from '../../application/delete-agent.use-case';

@Controller('agents')
export class DeleteAgentController {
  constructor(private readonly useCase: DeleteAgentUseCase) {}

  @Delete(':id')
  execute(@Param('id') id: string): Promise<DeleteAgentResult> {
    return this.useCase.execute(id);
  }
}
