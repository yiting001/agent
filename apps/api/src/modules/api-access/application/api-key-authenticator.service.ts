import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import type { ApiApplication } from '../domain/api-application';
import { ApiApplicationRepository } from './api-application.repository';

@Injectable()
export class ApiKeyAuthenticatorService {
  constructor(private readonly repository: ApiApplicationRepository) {}

  async authenticate(secretKey: string): Promise<ApiApplication> {
    const keyHash = createHash('sha256').update(secretKey).digest('hex');
    const application = await this.repository.findByKeyHash(keyHash);

    if (!application || application.status !== 'ready') {
      throw new ApplicationError('unauthorized', 'API 访问凭证无效或已停用。');
    }

    return application;
  }
}
