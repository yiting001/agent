import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import type { SkillTool } from '../domain/skill';
import { McpClient, type McpConnection } from '../application/mcp-client';

/** 只接受 MCP content 中明确的 text 片段，忽略未知结构。 */
function readTextContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .filter(
      (part: unknown): part is { text: string; type: 'text' } =>
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        part.type === 'text' &&
        'text' in part &&
        typeof part.text === 'string',
    )
    .map((part) => part.text)
    .join('\n');
}

/** 基于官方 SDK 的 MCP Streamable HTTP 客户端；每次操作独立建连，保持无状态。 */
@Injectable()
export class StreamableHttpMcpClient extends McpClient {
  private readonly clientName: string;

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.clientName = config.mcpClientName;
  }

  /** 将服务端错误转换为应用错误，不主动拼接敏感连接头。 */
  async callTool(
    connection: McpConnection,
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    return this.withClient(connection, async (client) => {
      const result = await client.callTool({ arguments: args, name });

      if (result.isError) {
        throw new ApplicationError(
          'service_unavailable',
          `MCP 工具 ${name} 执行失败：${readTextContent(result.content)}`,
        );
      }

      return readTextContent(result.content);
    });
  }

  async listTools(connection: McpConnection): Promise<SkillTool[]> {
    return this.withClient(connection, async (client) => {
      const result = await client.listTools();

      return result.tools.map((tool) => ({
        description: tool.description ?? '',
        inputSchema: tool.inputSchema,
        name: tool.name,
      }));
    });
  }

  /** 每次操作独立建连并在 finally 关闭，避免跨请求复用鉴权上下文。 */
  private async withClient<T>(
    connection: McpConnection,
    operation: (client: Client) => Promise<T>,
  ): Promise<T> {
    const client = new Client({ name: this.clientName, version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(
      new URL(connection.endpoint),
      { requestInit: { headers: connection.headers } },
    );

    try {
      await client.connect(transport);

      return await operation(client);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      const detail = error instanceof Error ? error.message : '网络连接失败';

      throw new ApplicationError(
        'service_unavailable',
        `无法连接 MCP 服务：${detail}`,
      );
    } finally {
      await client.close().catch(() => undefined);
    }
  }
}
