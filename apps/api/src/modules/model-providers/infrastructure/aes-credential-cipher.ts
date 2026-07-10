import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import type { ApplicationConfig } from '../../../config/application.config';
import type { EncryptedCredential } from '../domain/model-provider';
import { CredentialCipher } from '../application/credential-cipher';

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX_LENGTH = 64;

@Injectable()
export class AesCredentialCipher extends CredentialCipher {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  decrypt(credential: EncryptedCredential): string {
    const key = this.getKey();
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(credential.initializationVector, 'base64'),
    );

    decipher.setAuthTag(Buffer.from(credential.authTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(credential.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  encrypt(plaintext: string): EncryptedCredential {
    const key = this.getKey();
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key, initializationVector);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return {
      authTag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      initializationVector: initializationVector.toString('base64'),
    };
  }

  private getKey(): Buffer {
    const config =
      this.configService.getOrThrow<ApplicationConfig>('application');
    const value = config.credentialEncryptionKey;

    if (
      !value ||
      value.length !== KEY_HEX_LENGTH ||
      !/^[\da-f]+$/i.test(value)
    ) {
      throw new ApplicationError(
        'service_unavailable',
        'CREDENTIAL_ENCRYPTION_KEY 必须配置为 64 位十六进制密钥。',
      );
    }

    return Buffer.from(value, 'hex');
  }
}
