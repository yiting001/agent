import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import {
  ApiRateLimiter,
  ApiRateLimitPolicyProvider,
  type ApiRateLimitKind,
} from './api-rate-limiter';

@Injectable()
export class EnforceApiRateLimitService {
  constructor(
    private readonly limiter: ApiRateLimiter,
    private readonly policies: ApiRateLimitPolicyProvider,
  ) {}

  async execute(input: {
    identifier: string;
    kind: ApiRateLimitKind;
  }): Promise<void> {
    const result = await this.limiter.consume({
      ...input,
      policy: this.policies.get(input.kind),
    });

    if (!result.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(result.retryAfterMs / 1_000),
      );

      throw new ApplicationError(
        'too_many_requests',
        `请求过于频繁，请在 ${retryAfterSeconds} 秒后重试。`,
      );
    }
  }
}
