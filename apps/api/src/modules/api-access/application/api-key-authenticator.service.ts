import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import type { ApiApplication } from '../domain/api-application';
import { ApiApplicationRepository } from './api-application.repository';

/** 通过密钥摘要认证已启用的 API 应用。 */
@Injectable()
export class ApiKeyAuthenticatorService {
  constructor(private readonly repository: ApiApplicationRepository) {}

  /** 原始密钥只用于本次摘要计算，不记录日志也不持久化。 */
  async authenticate(secretKey: string): Promise<ApiApplication> {
    const keyHash = createHash('sha256').update(secretKey).digest('hex');
    const application = await this.repository.findByKeyHash(keyHash);

    if (!application || application.status !== 'ready') {
      throw new ApplicationError('unauthorized', 'API 访问凭证无效或已停用。');
    }

    return application;
  }
}
