import type { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import { AesCredentialCipher } from './aes-credential-cipher';

function createConfigService(key?: string): ConfigService {
  return {
    getOrThrow: () =>
      ({
        credentialEncryptionKey: key,
      }) as ApplicationConfig,
  } as unknown as ConfigService;
}

describe('AesCredentialCipher', () => {
  it('encrypts and decrypts a model credential', () => {
    const cipher = new AesCredentialCipher(
      createConfigService('11'.repeat(32)),
    );
    const encrypted = cipher.encrypt('sk-private-value');

    expect(encrypted.ciphertext).not.toContain('sk-private-value');
    expect(cipher.decrypt(encrypted)).toBe('sk-private-value');
  });

  it('rejects a missing encryption key', () => {
    const cipher = new AesCredentialCipher(createConfigService());

    expect(() => cipher.encrypt('secret')).toThrow(ApplicationError);
  });
});
