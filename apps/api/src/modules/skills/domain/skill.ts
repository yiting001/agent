export type SkillType = 'mcp' | 'prompt';

/** MCP Server 声明的单个工具（OpenAI function calling 兼容的 JSON Schema 参数）。 */
export interface SkillTool {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
}

export interface Skill {
  /** prompt 技能的指令内容；mcp 技能为空。 */
  content: string;
  createdAt: Date;
  description: string;
  enabled: boolean;
  /** mcp 技能的 Streamable HTTP 服务地址；prompt 技能为空。 */
  endpoint: string;
  /** 连接 MCP Server 的附加请求头（如鉴权），不对外暴露。 */
  headers: Record<string, string>;
  id: string;
  name: string;
  /** 安装或刷新时从 MCP Server 缓存的工具清单。 */
  tools: SkillTool[];
  type: SkillType;
  updatedAt: Date;
}

export interface SkillSummary {
  content: string;
  createdAt: string;
  description: string;
  enabled: boolean;
  endpoint: string;
  id: string;
  name: string;
  tools: SkillTool[];
  type: SkillType;
  updatedAt: string;
}

export function toSkillSummary(skill: Skill): SkillSummary {
  return {
    content: skill.content,
    createdAt: skill.createdAt.toISOString(),
    description: skill.description,
    enabled: skill.enabled,
    endpoint: skill.endpoint,
    id: skill.id,
    name: skill.name,
    tools: skill.tools,
    type: skill.type,
    updatedAt: skill.updatedAt.toISOString(),
  };
}
