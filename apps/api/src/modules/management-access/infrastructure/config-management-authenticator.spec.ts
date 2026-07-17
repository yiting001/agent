import type { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

import type { ManagementSecurityConfig } from '../../../config/management-security.config';
import { ApplicationError } from '../../../shared/application/application-error';
import { ConfigManagementAuthenticator } from './config-management-authenticator';

const TOKEN = `mgmt_${'A'.repeat(43)}`;

function configService(config: ManagementSecurityConfig): ConfigService {
  return {
    getOrThrow: jest.fn().mockReturnValue(config),
  } as unknown as ConfigService;
}

describe('ConfigManagementAuthenticator', () => {
  it('returns a copied principal for a matching digest', () => {
    const scopes = ['observability:metrics'] as const;
    const authenticator = new ConfigManagementAuthenticator(
      configService({
        credentials: [
          {
            scopes: [...scopes],
            subject: 'dashboard-reader',
            tokenHash: createHash('sha256').update(TOKEN).digest('hex'),
          },
        ],
      }),
    );

    const principal = authenticator.authenticate(TOKEN);

    expect(principal).toEqual({
      scopes: ['observability:metrics'],
      subject: 'dashboard-reader',
    });
    expect(principal.scopes).not.toBe(scopes);
  });

  it('rejects invalid credentials without including the presented token', () => {
    const authenticator = new ConfigManagementAuthenticator(
      configService({ credentials: [] }),
    );

    try {
      authenticator.authenticate(TOKEN);
      throw new Error('Expected authentication to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect(String(error)).not.toContain(TOKEN);
    }
  });
});
