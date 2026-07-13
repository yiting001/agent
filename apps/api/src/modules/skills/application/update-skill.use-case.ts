import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { SkillSummary } from '../domain/skill';
import { toSkillSummary } from '../domain/skill';
import { McpClient } from './mcp-client';
import { SkillRepository } from './skill.repository';

export interface UpdateSkillCommand {
  content: string;
  description: string;
  enabled: boolean;
  endpoint: string;
  headers?: Record<string, string>;
  id: string;
  name: string;
}

/** 更新技能配置；MCP 技能会重新连接服务并刷新工具清单。 */
@Injectable()
export class UpdateSkillUseCase {
  constructor(
    private readonly repository: SkillRepository,
    private readonly mcpClient: McpClient,
  ) {}

  async execute(command: UpdateSkillCommand): Promise<SkillSummary> {
    const skill = await this.repository.findById(command.id);

    if (!skill) {
      throw new ApplicationError('not_found', '技能不存在。');
    }

    if (skill.type === 'prompt' && !command.content.trim()) {
      throw new ApplicationError(
        'invalid_operation',
        '提示词技能必须提供指令内容。',
      );
    }

    if (skill.type === 'mcp' && !command.endpoint.trim()) {
      throw new ApplicationError(
        'invalid_operation',
        'MCP 技能必须提供服务地址。',
      );
    }

    const headers = command.headers ?? skill.headers;
    const tools =
      skill.type === 'mcp' && command.enabled
        ? await this.mcpClient.listTools({
            endpoint: command.endpoint,
            headers,
          })
        : skill.tools;
    const updated = {
      ...skill,
      content: skill.type === 'prompt' ? command.content : '',
      description: command.description,
      enabled: command.enabled,
      endpoint: skill.type === 'mcp' ? command.endpoint : '',
      headers: skill.type === 'mcp' ? headers : {},
      name: command.name,
      tools,
      updatedAt: new Date(),
    };

    await this.repository.save(updated);

    return toSkillSummary(updated);
  }
}
