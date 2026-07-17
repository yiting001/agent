import type { ObservabilityGenerationMessage } from '../domain/observability-generation';

export interface ObservabilityContentPayload {
  inputMessages: ObservabilityGenerationMessage[];
  outputText: string;
}

export interface EncryptedObservabilityContent {
  authTag: string;
  ciphertext: string;
  initializationVector: string;
  keyVersion: string;
}

/** 加密实现位于基础设施层，仓储只依赖该正文保护端口。 */
export abstract class ObservabilityContentCipher {
  abstract readonly activeKeyVersion: string;

  abstract decrypt(
    generationId: string,
    encrypted: EncryptedObservabilityContent,
  ): ObservabilityContentPayload;

  abstract encrypt(
    generationId: string,
    payload: ObservabilityContentPayload,
  ): EncryptedObservabilityContent;
}
