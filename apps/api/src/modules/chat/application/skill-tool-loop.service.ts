import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import {
  type ChatToolCall,
  type ChatToolDefinition,
  ModelGateway,
  type ToolChatInput,
  type ToolLoopMessage,
} from '../../model-providers/application/model-gateway';
import type { Skill } from '../../skills/domain/skill';
import { SkillRuntimeService } from '../../skills/application/skill-runtime.service';

export interface ToolLoopRequest {
  apiKey: string;
  baseUrl: string;
  messages: ToolLoopMessage[];
  model: string;
  temperature: number;
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);

    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * OpenAI function calling 工具执行环：模型请求工具 → 经 MCP 执行 →
 * 结果回填对话 → 续跑，直到模型产出最终回答或达到轮数上限。
 */
@Injectable()
export class SkillToolLoopService {
  private readonly maxRounds: number;

  constructor(
    private readonly modelGateway: ModelGateway,
    private readonly skillRuntime: SkillRuntimeService,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.maxRounds = config.skillToolMaxRounds;
  }

  async run(request: ToolLoopRequest, toolProviders: Skill[]): Promise<string> {
    const { definitions, owners } = this.collectTools(toolProviders);
    const messages: ToolLoopMessage[] = [...request.messages];

    for (let round = 0; round < this.maxRounds; round += 1) {
      const input: ToolChatInput = {
        apiKey: request.apiKey,
        baseUrl: request.baseUrl,
        messages,
        model: request.model,
        temperature: request.temperature,
        tools: definitions,
      };
      const result = await this.modelGateway.chatWithTools(input);

      if (result.toolCalls.length === 0) {
        return result.content;
      }

      messages.push({
        content: result.content,
        role: 'assistant',
        tool_calls: result.toolCalls.map((call) => ({
          function: { arguments: call.arguments, name: call.name },
          id: call.id,
          type: 'function',
        })),
      });

      for (const call of result.toolCalls) {
        messages.push({
          content: await this.executeToolCall(owners, call),
          role: 'tool',
          tool_call_id: call.id,
        });
      }
    }

    throw new ApplicationError(
      'service_unavailable',
      `工具调用超出最大轮数（${this.maxRounds}），已终止本次对话。`,
    );
  }

  /** 汇总各技能的工具定义；同名工具以先绑定的技能为准。 */
  private collectTools(toolProviders: Skill[]): {
    definitions: ChatToolDefinition[];
    owners: Map<string, Skill>;
  } {
    const definitions: ChatToolDefinition[] = [];
    const owners = new Map<string, Skill>();

    for (const skill of toolProviders) {
      for (const tool of skill.tools) {
        if (owners.has(tool.name)) {
          continue;
        }

        owners.set(tool.name, skill);
        definitions.push({
          function: {
            description: tool.description,
            name: tool.name,
            parameters: tool.inputSchema,
          },
          type: 'function',
        });
      }
    }

    return { definitions, owners };
  }

  /** 工具执行失败时把错误信息回填给模型，让其自行修正或答复。 */
  private async executeToolCall(
    owners: Map<string, Skill>,
    call: ChatToolCall,
  ): Promise<string> {
    const skill = owners.get(call.name);

    if (!skill) {
      return `未找到名为 ${call.name} 的工具。`;
    }

    try {
      return await this.skillRuntime.callTool(
        skill,
        call.name,
        parseToolArguments(call.arguments),
      );
    } catch (error) {
      return error instanceof Error ? error.message : '工具执行失败。';
    }
  }
}
