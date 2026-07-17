import { ApplicationError } from '../../../shared/application/application-error';
import type {
  EncryptedObservabilityContent,
  ObservabilityContentPayload,
  ObservabilityContentCipher,
} from '../application/observability-content-cipher';
import type { ObservabilityGenerationContentEntity } from './observability-generation-content.entity';

export interface EncryptedContentColumns {
  authTag: string;
  ciphertext: string;
  initializationVector: string;
  inputMessages: null;
  keyVersion: string;
  outputText: null;
}

export function encryptContentColumns(
  cipher: ObservabilityContentCipher,
  generationId: string,
  payload: ObservabilityContentPayload,
): EncryptedContentColumns {
  const encrypted = cipher.encrypt(generationId, payload);

  return {
    ...encrypted,
    inputMessages: null,
    outputText: null,
  };
}

/** 仅在兼容迁移窗口读取旧明文；部分密文元数据一律视为损坏。 */
export function readPersistedContent(
  cipher: ObservabilityContentCipher,
  entity: ObservabilityGenerationContentEntity,
): ObservabilityContentPayload {
  const encrypted = readEncryptedColumns(entity);

  if (encrypted) {
    try {
      return cipher.decrypt(entity.generationId, encrypted);
    } catch {
      throw new ApplicationError(
        'service_unavailable',
        '观测正文无法通过完整性校验。',
      );
    }
  }

  if (entity.inputMessages !== null && entity.outputText !== null) {
    return {
      inputMessages: entity.inputMessages,
      outputText: entity.outputText,
    };
  }

  throw new ApplicationError(
    'service_unavailable',
    '观测正文的加密元数据不完整。',
  );
}

function readEncryptedColumns(
  entity: ObservabilityGenerationContentEntity,
): EncryptedObservabilityContent | undefined {
  const columns = [
    entity.authTag,
    entity.ciphertext,
    entity.initializationVector,
    entity.keyVersion,
  ];
  const populated = columns.filter((value) => value !== null).length;

  if (populated === 0) {
    return undefined;
  }

  if (populated !== columns.length) {
    throw new ApplicationError(
      'service_unavailable',
      '观测正文的加密元数据不完整。',
    );
  }

  return {
    authTag: entity.authTag as string,
    ciphertext: entity.ciphertext as string,
    initializationVector: entity.initializationVector as string,
    keyVersion: entity.keyVersion as string,
  };
}
