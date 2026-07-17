import type { HttpClient } from '@/shared/http/http-client';

import { ManagementAccessGateway } from '../application/management-access.gateway';
import type { ManagementSession } from '../domain/management-access';

export class HttpManagementAccessGateway extends ManagementAccessGateway {
  constructor(private readonly httpClient: Pick<HttpClient, 'get'>) {
    super();
  }

  getSession(): Promise<ManagementSession> {
    return this.httpClient.get<ManagementSession>('/management-access/session');
  }
}
