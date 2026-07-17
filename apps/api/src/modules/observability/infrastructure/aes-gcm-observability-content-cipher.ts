import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import type { ObservabilityEncryptionConfiguration } from '../../../config/observability-encryption.config';
import {
  type EncryptedObservabilityContent,
  type ObservabilityContentPayload,
  ObservabilityContentCipher,
} from '../application/observability-content-cipher';
import {
  decryptObservabilityContent,
  encryptObservabilityContent,
} from './observability-content-crypto';

@Injectable()
export class AesGcmObservabilityContentCipher extends ObservabilityContentCipher {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  get activeKeyVersion(): string {
    return this.configuration.activeKeyVersion;
  }

  decrypt(
    generationId: string,
    encrypted: EncryptedObservabilityContent,
  ): ObservabilityContentPayload {
    return decryptObservabilityContent(
      this.configuration,
      generationId,
      encrypted,
    );
  }

  encrypt(
    generationId: string,
    payload: ObservabilityContentPayload,
  ): EncryptedObservabilityContent {
    return encryptObservabilityContent(
      this.configuration,
      generationId,
      payload,
    );
  }

  private get configuration(): ObservabilityEncryptionConfiguration {
    return this.configService.getOrThrow<ApplicationConfig>('application')
      .observabilityContentEncryption;
  }
}
