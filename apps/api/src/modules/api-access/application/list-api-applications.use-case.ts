import { Injectable } from '@nestjs/common';

import type { ApiApplicationSummary } from '../domain/api-application';
import { ApiApplicationRepository } from './api-application.repository';

@Injectable()
export class ListApiApplicationsUseCase {
  constructor(private readonly repository: ApiApplicationRepository) {}

  execute(): Promise<ApiApplicationSummary[]> {
    return this.repository.list();
  }
}
