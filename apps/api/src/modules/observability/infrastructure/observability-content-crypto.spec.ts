import type { ObservabilityEncryptionConfiguration } from '../../../config/observability-encryption.config';
import {
  decryptObservabilityContent,
  encryptObservabilityContent,
} from './observability-content-crypto';

describe('observability content crypto', () => {
  const v1: ObservabilityEncryptionConfiguration = {
    activeKeyVersion: 'v1',
    keys: { v1: '11'.repeat(32) },
  };
  const payload = {
    inputMessages: [{ content: '用户输入', role: 'user' as const }],
    outputText: '模型输出',
  };

  it('round-trips one structured payload with AES-256-GCM', () => {
    const encrypted = encryptObservabilityContent(v1, 'generation-1', payload);

    expect(encrypted.keyVersion).toBe('v1');
    expect(encrypted.ciphertext).not.toContain('用户输入');
    expect(decryptObservabilityContent(v1, 'generation-1', encrypted)).toEqual(
      payload,
    );
  });

  it('rejects tampering and ciphertext swapping between generations', () => {
    const encrypted = encryptObservabilityContent(v1, 'generation-1', payload);

    expect(() =>
      decryptObservabilityContent(v1, 'generation-1', {
        ...encrypted,
        ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA`,
      }),
    ).toThrow('authentication failed');
    expect(() =>
      decryptObservabilityContent(v1, 'generation-2', encrypted),
    ).toThrow('authentication failed');
  });

  it('rejects truncated authentication tags and initialization vectors', () => {
    const encrypted = encryptObservabilityContent(v1, 'generation-1', payload);
    const shortTag = Buffer.from(encrypted.authTag, 'base64')
      .subarray(0, 4)
      .toString('base64');
    const shortInitializationVector = Buffer.from(
      encrypted.initializationVector,
      'base64',
    )
      .subarray(0, 8)
      .toString('base64');

    expect(() =>
      decryptObservabilityContent(v1, 'generation-1', {
        ...encrypted,
        authTag: shortTag,
      }),
    ).toThrow('authentication failed');
    expect(() =>
      decryptObservabilityContent(v1, 'generation-1', {
        ...encrypted,
        initializationVector: shortInitializationVector,
      }),
    ).toThrow('authentication failed');
  });

  it('reads an old key version and writes only the active version', () => {
    const encrypted = encryptObservabilityContent(v1, 'generation-1', payload);
    const rotated: ObservabilityEncryptionConfiguration = {
      activeKeyVersion: 'v2',
      keys: { v1: '11'.repeat(32), v2: '22'.repeat(32) },
    };

    expect(
      decryptObservabilityContent(rotated, 'generation-1', encrypted),
    ).toEqual(payload);
    expect(
      encryptObservabilityContent(rotated, 'generation-1', payload).keyVersion,
    ).toBe('v2');
  });

  it('fails when an old key version is unavailable', () => {
    const encrypted = encryptObservabilityContent(v1, 'generation-1', payload);

    expect(() =>
      decryptObservabilityContent(
        { activeKeyVersion: 'v2', keys: { v2: '22'.repeat(32) } },
        'generation-1',
        encrypted,
      ),
    ).toThrow('key version v1 is unavailable');
  });

  it('does not resolve key versions through the object prototype', () => {
    expect(() =>
      encryptObservabilityContent(
        { activeKeyVersion: 'toString', keys: { v1: '11'.repeat(32) } },
        'generation-1',
        payload,
      ),
    ).toThrow('active observability content key is unavailable');
    expect(() =>
      decryptObservabilityContent(v1, 'generation-1', {
        authTag: 'AA==',
        ciphertext: 'AA==',
        initializationVector: 'AA==',
        keyVersion: 'toString',
      }),
    ).toThrow('key version toString is unavailable');
  });
});
