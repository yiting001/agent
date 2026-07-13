import { Injectable } from '@nestjs/common';

import type { Skill } from '../domain/skill';
import { McpClient } from './mcp-client';
import { SkillRepository } from './skill.repository';

export interface AgentSkillSet {
  /** prompt 技能，注入 system prompt。 */
  instructions: Skill[];
  /** mcp 技能，工具经 function calling 暴露给模型。 */
  toolProviders: Skill[];
}

/** 对话链路的技能装配与工具调用入口。 */
@Injectable()
export class SkillRuntimeService {
  constructor(
    private readonly repository: SkillRepository,
    private readonly mcpClient: McpClient,
  ) {}

  callTool(
    skill: Skill,
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    return this.mcpClient.callTool(
      { endpoint: skill.endpoint, headers: skill.headers },
      name,
      args,
    );
  }

  async load(skillIds: string[]): Promise<AgentSkillSet> {
    const skills = (await this.repository.findByIds(skillIds)).filter(
      (skill) => skill.enabled,
    );

    return {
      instructions: skills.filter((skill) => skill.type === 'prompt'),
      toolProviders: skills.filter(
        (skill) => skill.type === 'mcp' && skill.tools.length > 0,
      ),
    };
  }
}
