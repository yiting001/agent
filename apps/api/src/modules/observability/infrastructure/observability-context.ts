import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface ObservabilityTraceContext {
  agentId?: string;
  conversationId?: string;
  source?: string;
  spanId: string;
  traceId: string;
}

@Injectable()
export class ObservabilityContext {
  private readonly storage = new AsyncLocalStorage<ObservabilityTraceContext>();

  current(): ObservabilityTraceContext | undefined {
    return this.storage.getStore();
  }

  enrich(
    attributes: Pick<
      ObservabilityTraceContext,
      'agentId' | 'conversationId' | 'source'
    >,
  ): void {
    const current = this.current();

    if (current) {
      Object.assign(current, attributes);
    }
  }

  run<Output>(
    context: ObservabilityTraceContext,
    operation: () => Output,
  ): Output {
    return this.storage.run(context, operation);
  }
}
