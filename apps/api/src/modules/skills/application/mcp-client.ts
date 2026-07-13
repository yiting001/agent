import type { SkillTool } from '../domain/skill';

export interface McpConnection {
  endpoint: string;
  headers: Record<string, string>;
}

export abstract class McpClient {
  abstract callTool(
    connection: McpConnection,
    name: string,
    args: Record<string, unknown>,
  ): Promise<string>;

  abstract listTools(connection: McpConnection): Promise<SkillTool[]>;
}
