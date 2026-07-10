import type { Agent, AgentSummary } from '../domain/agent';

export function toAgentSummary(
  agent: Agent,
  moduleIds: string[],
): AgentSummary {
  return {
    conversationCount: agent.conversationCount,
    description: agent.description,
    id: agent.id,
    moduleIds: [...new Set(moduleIds)],
    name: agent.name,
    providerId: agent.providerId,
    status: agent.status,
    systemPrompt: agent.systemPrompt,
    temperature: agent.temperature,
    updatedAt: agent.updatedAt.toISOString(),
  };
}
