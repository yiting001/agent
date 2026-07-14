import { Injectable } from '@nestjs/common';

import type { PublicAgentSummary } from '../domain/agent';
import { AgentRepository } from './agent.repository';

/**
 * 面向公开对话页列出可选智能体：
 * 只返回已发布智能体，并裁剪为展示必需字段，
 * 避免提示词、模型供应商等后台信息泄露到前台。
 */
@Injectable()
export class ListPublishedAgentsUseCase {
  constructor(private readonly repository: AgentRepository) {}

  async execute(): Promise<PublicAgentSummary[]> {
    const agents = await this.repository.list();

    return agents
      .filter((agent) => agent.status === 'published')
      .map(({ description, id, name }) => ({ description, id, name }));
  }
}
