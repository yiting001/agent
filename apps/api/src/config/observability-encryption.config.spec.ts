import { parseObservabilityEncryptionConfiguration } from './observability-encryption.config';

describe('observability encryption configuration', () => {
  const credentialRoot = '11'.repeat(32);

  it('derives a stable domain-specific fallback key', () => {
    const first = parseObservabilityEncryptionConfiguration({
      credentialEncryptionKey: credentialRoot,
    });
    const second = parseObservabilityEncryptionConfiguration({
      credentialEncryptionKey: credentialRoot,
    });

    expect(first).toEqual(second);
    expect(first.activeKeyVersion).toBe('credential-derived-v1');
    expect(first.keys['credential-derived-v1']).toHaveLength(64);
    expect(first.keys['credential-derived-v1']).not.toBe(credentialRoot);
  });

  it('uses the configured active key while retaining the derived legacy key', () => {
    const configuration = parseObservabilityEncryptionConfiguration({
      activeKeyVersion: 'v2',
      credentialEncryptionKey: credentialRoot,
      serializedKeys: JSON.stringify({ v2: '22'.repeat(32) }),
    });

    expect(configuration.activeKeyVersion).toBe('v2');
    expect(configuration.keys.v2).toBe('22'.repeat(32));
    expect(configuration.keys['credential-derived-v1']).toBeDefined();
  });

  it('rejects an explicit key that shadows the reserved derived version', () => {
    expect(() =>
      parseObservabilityEncryptionConfiguration({
        activeKeyVersion: 'credential-derived-v1',
        credentialEncryptionKey: credentialRoot,
        serializedKeys: JSON.stringify({
          'credential-derived-v1': '22'.repeat(32),
        }),
      }),
    ).toThrow('is reserved for the credential-derived fallback');
  });

  it('rejects missing, malformed and inactive keyrings', () => {
    expect(() => parseObservabilityEncryptionConfiguration({})).toThrow(
      'is required',
    );
    expect(() =>
      parseObservabilityEncryptionConfiguration({
        activeKeyVersion: 'v2',
        serializedKeys: JSON.stringify({ v1: '22'.repeat(32) }),
      }),
    ).toThrow('is not present');
    expect(() =>
      parseObservabilityEncryptionConfiguration({
        activeKeyVersion: 'v1',
        serializedKeys: JSON.stringify({ v1: 'short' }),
      }),
    ).toThrow('64-character hexadecimal key');
    expect(() =>
      parseObservabilityEncryptionConfiguration({
        activeKeyVersion: 'toString',
        serializedKeys: JSON.stringify({ v1: '22'.repeat(32) }),
      }),
    ).toThrow('is not present');
  });
});
