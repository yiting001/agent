import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import type { Skill, SkillSummary, SkillType } from '../domain/skill';
import { toSkillSummary } from '../domain/skill';
import { McpClient } from './mcp-client';
import { SkillRepository } from './skill.repository';

export interface InstallSkillCommand {
  content: string;
  description: string;
  endpoint: string;
  headers: Record<string, string>;
  name: string;
  type: SkillType;
}

@Injectable()
export class InstallSkillUseCase {
  constructor(
    private readonly repository: SkillRepository,
    private readonly mcpClient: McpClient,
  ) {}

  async execute(command: InstallSkillCommand): Promise<SkillSummary> {
    if (command.type === 'prompt' && !command.content.trim()) {
      throw new ApplicationError(
        'invalid_operation',
        '提示词技能必须提供指令内容。',
      );
    }

    if (command.type === 'mcp' && !command.endpoint.trim()) {
      throw new ApplicationError(
        'invalid_operation',
        'MCP 技能必须提供服务地址。',
      );
    }

    const tools =
      command.type === 'mcp'
        ? await this.mcpClient.listTools({
            endpoint: command.endpoint,
            headers: command.headers,
          })
        : [];
    const now = new Date();
    const skill: Skill = {
      content: command.type === 'prompt' ? command.content : '',
      createdAt: now,
      description: command.description,
      enabled: true,
      endpoint: command.type === 'mcp' ? command.endpoint : '',
      headers: command.type === 'mcp' ? command.headers : {},
      id: randomUUID(),
      name: command.name,
      tools,
      type: command.type,
      updatedAt: now,
    };

    await this.repository.save(skill);

    return toSkillSummary(skill);
  }
}
