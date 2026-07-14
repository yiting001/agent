/** 限流策略适用的入口。 */
export type ApiRateLimitKind = 'application' | 'public_chat';

/** 固定窗口限流策略。 */
export interface ApiRateLimitPolicy {
  /** 单个窗口允许的最大请求数。 */
  maxRequests: number;
  /** 窗口时长。 */
  windowMs: number;
}

/** 根据入口类型提供配置化限流策略。 */
export abstract class ApiRateLimitPolicyProvider {
  abstract get(kind: ApiRateLimitKind): ApiRateLimitPolicy;
}

/** 可由 Redis 或进程内实现的限流消费端口。 */
export abstract class ApiRateLimiter {
  /** 原子消费一次配额，并返回拒绝时的剩余等待时间。 */
  abstract consume(input: {
    identifier: string;
    kind: ApiRateLimitKind;
    policy: ApiRateLimitPolicy;
  }): Promise<{ allowed: boolean; retryAfterMs: number }>;
}
