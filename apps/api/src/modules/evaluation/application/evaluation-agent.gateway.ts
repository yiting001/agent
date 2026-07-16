export interface EvaluationAgentReference {
  status: 'disabled' | 'draft' | 'published';
}

export abstract class EvaluationAgentGateway {
  abstract get(agentId: string): Promise<EvaluationAgentReference>;
  abstract run(agentId: string, input: string): Promise<string>;
}
