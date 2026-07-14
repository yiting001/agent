export type ApiRateLimitKind = 'application' | 'public_chat';

export interface ApiRateLimitPolicy {
  maxRequests: number;
  windowMs: number;
}

export abstract class ApiRateLimitPolicyProvider {
  abstract get(kind: ApiRateLimitKind): ApiRateLimitPolicy;
}

export abstract class ApiRateLimiter {
  abstract consume(input: {
    identifier: string;
    kind: ApiRateLimitKind;
    policy: ApiRateLimitPolicy;
  }): Promise<{ allowed: boolean; retryAfterMs: number }>;
}
