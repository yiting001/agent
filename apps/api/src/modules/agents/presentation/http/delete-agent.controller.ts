import { Controller, Delete, HttpCode, Param } from '@nestjs/common';

import { DeleteAgentUseCase } from '../../application/delete-agent.use-case';

@Controller('agents')
export class DeleteAgentController {
  constructor(private readonly useCase: DeleteAgentUseCase) {}

  @Delete(':id')
  @HttpCode(204)
  execute(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
