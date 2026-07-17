import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

import type { ManagementSecurityConfig } from '../../../config/management-security.config';
import { ApplicationError } from '../../../shared/application/application-error';
import { ManagementAuthenticator } from '../application/management-authenticator';
import type { ManagementPrincipal } from '../domain/management-access';

/** Authenticates env-configured credentials using only fixed-length SHA-256 digests. */
@Injectable()
export class ConfigManagementAuthenticator extends ManagementAuthenticator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  authenticate(token: string): ManagementPrincipal {
    const presentedHash = createHash('sha256').update(token).digest();
    const config =
      this.configService.getOrThrow<ManagementSecurityConfig>(
        'managementSecurity',
      );
    let matched: ManagementPrincipal | undefined;

    for (const credential of config.credentials) {
      const configuredHash = Buffer.from(credential.tokenHash, 'hex');

      if (
        configuredHash.length === presentedHash.length &&
        timingSafeEqual(configuredHash, presentedHash)
      ) {
        matched = {
          scopes: [...credential.scopes],
          subject: credential.subject,
        };
      }
    }

    if (!matched) {
      throw new ApplicationError('unauthorized', '管理访问凭证无效。');
    }

    return matched;
  }
}
