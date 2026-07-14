import type { SkillTool } from '../domain/skill';

/** 调用 MCP Server 所需的地址和敏感请求头。 */
export interface McpConnection {
  endpoint: string;
  headers: Record<string, string>;
}

/** 隔离 MCP Streamable HTTP 协议和 SDK 的应用层端口。 */
export abstract class McpClient {
  /** 调用已声明工具并返回可注入模型上下文的文本结果。 */
  abstract callTool(
    connection: McpConnection,
    name: string,
    args: Record<string, unknown>,
  ): Promise<string>;

  /** 拉取服务端工具清单，用于安装或刷新技能快照。 */
  abstract listTools(connection: McpConnection): Promise<SkillTool[]>;
}
