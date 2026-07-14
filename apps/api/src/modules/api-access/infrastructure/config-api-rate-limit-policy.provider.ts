import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import {
  ApiRateLimitPolicyProvider,
  type ApiRateLimitKind,
  type ApiRateLimitPolicy,
} from '../application/api-rate-limiter';

@Injectable()
export class ConfigApiRateLimitPolicyProvider extends ApiRateLimitPolicyProvider {
  private readonly applicationPolicy: ApiRateLimitPolicy;
  private readonly publicChatPolicy: ApiRateLimitPolicy;

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.applicationPolicy = {
      maxRequests: config.apiRateLimitMax,
      windowMs: config.rateLimitWindowMs,
    };
    this.publicChatPolicy = {
      maxRequests: config.publicChatRateLimitMax,
      windowMs: config.rateLimitWindowMs,
    };
  }

  get(kind: ApiRateLimitKind): ApiRateLimitPolicy {
    return kind === 'application'
      ? this.applicationPolicy
      : this.publicChatPolicy;
  }
}
