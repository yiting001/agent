import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '@/shared/http/http-client';

import { HttpManagementAccessGateway } from './http-management-access.gateway';

describe('HttpManagementAccessGateway', () => {
  it('reads the authenticated management session', async () => {
    const get = vi.fn().mockResolvedValue({ scopes: [], subject: 'operator' });
    const gateway = new HttpManagementAccessGateway({
      get: get as HttpClient['get'],
    });

    await gateway.getSession();

    expect(get).toHaveBeenCalledWith('/management-access/session');
  });
});
