import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import { AgentCatalogService } from '../../agents/application/agent-catalog.service';
import type { ApiApplicationSummary } from '../domain/api-application';
import { ApiApplicationRepository } from './api-application.repository';

/** 创建绑定到单个已发布智能体的 API 应用。 */
export interface CreateApiApplicationCommand {
  agentId: string;
  name: string;
}

/** 将高熵原始密钥转换为固定长度、不可逆的持久化标识。 */
function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** 生成只展示一次的 API 密钥，并仅持久化摘要和掩码。 */
@Injectable()
export class CreateApiApplicationUseCase {
  constructor(
    private readonly repository: ApiApplicationRepository,
    private readonly agents: AgentCatalogService,
  ) {}

  /** 仅允许为 published 智能体创建正式 API 凭证。 */
  async execute(
    command: CreateApiApplicationCommand,
  ): Promise<ApiApplicationSummary> {
    const agent = await this.agents.get(command.agentId);

    if (agent.status !== 'published') {
      throw new ApplicationError(
        'invalid_operation',
        '只有已发布智能体可以创建 API 应用。',
      );
    }

    const id = randomUUID();
    const secretKey = `ag_live_${randomBytes(32).toString('base64url')}`;
    const maskedKey = `${secretKey.slice(0, 12)}••••${secretKey.slice(-4)}`;
    const createdAt = new Date();

    await this.repository.save({
      agentId: command.agentId,
      createdAt,
      id,
      keyHash: hashKey(secretKey),
      maskedKey,
      name: command.name,
      requestCount: 0,
      status: 'ready',
    });

    return {
      agentId: command.agentId,
      createdAt: createdAt.toISOString(),
      endpoint: '/v1/chat/completions',
      id,
      maskedKey,
      name: command.name,
      requestCount: 0,
      secretKey,
      status: 'ready',
    };
  }
}
