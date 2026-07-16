import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

import {
  type ObservabilityTrace,
  ObservabilityTraceContext,
} from '../application/observability-trace.context';

@Injectable()
export class ObservabilityContext extends ObservabilityTraceContext {
  private readonly storage = new AsyncLocalStorage<ObservabilityTrace>();

  current(): ObservabilityTrace | undefined {
    return this.storage.getStore();
  }

  enrich(
    attributes: Pick<
      ObservabilityTrace,
      'agentId' | 'conversationId' | 'source'
    >,
  ): void {
    const current = this.current();

    if (current) {
      Object.assign(current, attributes);
    }
  }

  run<Output>(context: ObservabilityTrace, operation: () => Output): Output {
    return this.storage.run(context, operation);
  }
}
