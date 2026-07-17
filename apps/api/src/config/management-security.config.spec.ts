import { createHash } from 'node:crypto';

import { MANAGEMENT_SCOPES } from '../modules/management-access/domain/management-access';
import { parseManagementSecurityConfig } from './management-security.config';

const TOKEN = `mgmt_${'A'.repeat(43)}`;

function environment(
  credentials: unknown,
  nodeEnv = 'test',
): NodeJS.ProcessEnv {
  return {
    MANAGEMENT_ACCESS_CREDENTIALS: JSON.stringify(credentials),
    NODE_ENV: nodeEnv,
  };
}

describe('management security configuration', () => {
  it('stores only credential hashes and known scopes', () => {
    const config = parseManagementSecurityConfig(
      environment([
        {
          scopes: MANAGEMENT_SCOPES,
          subject: 'operations-admin',
          token: TOKEN,
        },
      ]),
    );

    expect(config).toEqual({
      credentials: [
        {
          scopes: MANAGEMENT_SCOPES,
          subject: 'operations-admin',
          tokenHash: createHash('sha256').update(TOKEN).digest('hex'),
        },
      ],
    });
    expect(JSON.stringify(config)).not.toContain(TOKEN);
  });

  it('allows empty scopes and no development credentials', () => {
    expect(
      parseManagementSecurityConfig(
        environment([{ scopes: [], subject: 'viewer', token: TOKEN }]),
      ).credentials[0]?.scopes,
    ).toEqual([]);
    expect(parseManagementSecurityConfig({ NODE_ENV: 'development' })).toEqual({
      credentials: [],
    });
  });

  it('requires at least one production credential', () => {
    expect(() =>
      parseManagementSecurityConfig({ NODE_ENV: 'production' }),
    ).toThrow('must contain at least one entry in production');
    expect(() =>
      parseManagementSecurityConfig(environment([], 'production')),
    ).toThrow('must contain at least one entry in production');
  });

  it.each([
    ['not-json', 'must be valid JSON'],
    [JSON.stringify({}), 'must be a JSON array'],
    [
      JSON.stringify([
        { scopes: [], subject: 'admin', token: `mgmt_${'a'.repeat(42)}` },
      ]),
      'high-entropy mgmt_ credential',
    ],
    [
      JSON.stringify([
        {
          scopes: ['unknown:scope'],
          subject: 'admin',
          token: TOKEN,
        },
      ]),
      'unsupported scope',
    ],
  ])('rejects invalid credential configuration', (serialized, message) => {
    expect(() =>
      parseManagementSecurityConfig({
        MANAGEMENT_ACCESS_CREDENTIALS: serialized,
        NODE_ENV: 'test',
      }),
    ).toThrow(message);
  });

  it('rejects duplicate subjects and tokens without exposing the token', () => {
    const duplicateSubject = [
      { scopes: [], subject: 'admin', token: TOKEN },
      { scopes: [], subject: 'admin', token: `mgmt_${'B'.repeat(43)}` },
    ];
    const duplicateToken = [
      { scopes: [], subject: 'admin-a', token: TOKEN },
      { scopes: [], subject: 'admin-b', token: TOKEN },
    ];

    expect(() =>
      parseManagementSecurityConfig(environment(duplicateSubject)),
    ).toThrow('subjects must be unique');
    expect(() =>
      parseManagementSecurityConfig(environment(duplicateToken)),
    ).toThrow('tokens must be unique');

    try {
      parseManagementSecurityConfig(environment(duplicateToken));
    } catch (error) {
      expect(String(error)).not.toContain(TOKEN);
    }
  });
});
