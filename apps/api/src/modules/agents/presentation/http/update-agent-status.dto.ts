import { IsIn } from 'class-validator';

import type { AgentStatus } from '../../domain/agent';

export class UpdateAgentStatusDto {
  @IsIn(['disabled', 'draft', 'published'])
  status: AgentStatus;
}
