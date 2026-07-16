export interface ObservabilityTrace {
  agentId?: string;
  conversationId?: string;
  source?: string;
  spanId: string;
  traceId: string;
}

export abstract class ObservabilityTraceContext {
  abstract current(): ObservabilityTrace | undefined;

  abstract enrich(
    attributes: Pick<
      ObservabilityTrace,
      'agentId' | 'conversationId' | 'source'
    >,
  ): void;

  abstract run<Output>(
    context: ObservabilityTrace,
    operation: () => Output,
  ): Output;
}
