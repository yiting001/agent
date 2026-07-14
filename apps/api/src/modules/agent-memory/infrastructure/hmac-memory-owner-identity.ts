import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import { MemoryOwnerIdentity } from '../application/memory-owner-identity';

const TOKEN_VERSION = 'v1';
const TOKEN_KEY_CONTEXT = 'agent-memory-owner-token:v1';

/** 以独立派生的 HMAC key 签发匿名记忆主体 token。 */
@Injectable()
export class HmacMemoryOwnerIdentity extends MemoryOwnerIdentity {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  issue(): string {
    const subject = randomBytes(32).toString('base64url');
    const payload = `${TOKEN_VERSION}.${subject}`;

    return `${payload}.${this.sign(payload)}`;
  }

  resolve(token: string): string {
    const [version, subject, signature, ...remainder] = token.split('.');

    if (
      version !== TOKEN_VERSION ||
      !subject ||
      !signature ||
      remainder.length > 0
    ) {
      throw this.invalidToken();
    }

    const expected = Buffer.from(
      this.sign(`${version}.${subject}`),
      'base64url',
    );
    const actual = Buffer.from(signature, 'base64url');

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw this.invalidToken();
    }

    return createHash('sha256')
      .update(`${TOKEN_KEY_CONTEXT}:${subject}`)
      .digest('hex');
  }

  private invalidToken(): ApplicationError {
    return new ApplicationError(
      'unauthorized',
      '记忆主体凭证无效，请重新建立匿名会话。',
    );
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.getSigningKey())
      .update(payload)
      .digest('base64url');
  }

  private getSigningKey(): Buffer {
    const config =
      this.configService.getOrThrow<ApplicationConfig>('application');
    const rootKey = config.credentialEncryptionKey;

    if (!rootKey || !/^[0-9a-fA-F]{64}$/.test(rootKey)) {
      throw new ApplicationError(
        'service_unavailable',
        'CREDENTIAL_ENCRYPTION_KEY 必须配置后才能签发记忆主体 token。',
      );
    }

    return createHmac('sha256', Buffer.from(rootKey, 'hex'))
      .update(TOKEN_KEY_CONTEXT)
      .digest();
  }
}
