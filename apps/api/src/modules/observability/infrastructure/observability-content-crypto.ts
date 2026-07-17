import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { ObservabilityEncryptionConfiguration } from '../../../config/observability-encryption.config';
import type {
  EncryptedObservabilityContent,
  ObservabilityContentPayload,
} from '../application/observability-content-cipher';
import type { ObservabilityGenerationMessage } from '../domain/observability-generation';

const ALGORITHM = 'aes-256-gcm';
const PAYLOAD_SCHEMA_VERSION = 1;
const INITIALIZATION_VECTOR_BYTES = 12;
const AUTHENTICATION_TAG_BYTES = 16;

interface PersistedObservabilityContentPayload
  extends ObservabilityContentPayload {
  schemaVersion: typeof PAYLOAD_SCHEMA_VERSION;
}

export function decryptObservabilityContent(
  configuration: ObservabilityEncryptionConfiguration,
  generationId: string,
  encrypted: EncryptedObservabilityContent,
): ObservabilityContentPayload {
  const keyHex = Object.hasOwn(configuration.keys, encrypted.keyVersion)
    ? configuration.keys[encrypted.keyVersion]
    : undefined;

  if (typeof keyHex !== 'string') {
    throw new Error(
      `Observability content key version ${encrypted.keyVersion} is unavailable.`,
    );
  }

  try {
    const initializationVector = Buffer.from(
      encrypted.initializationVector,
      'base64',
    );
    const authTag = Buffer.from(encrypted.authTag, 'base64');

    if (
      initializationVector.length !== INITIALIZATION_VECTOR_BYTES ||
      authTag.length !== AUTHENTICATION_TAG_BYTES
    ) {
      throw new Error('Encrypted observability content shape is invalid.');
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      Buffer.from(keyHex, 'hex'),
      initializationVector,
      { authTagLength: AUTHENTICATION_TAG_BYTES },
    );

    decipher.setAAD(
      buildAdditionalAuthenticatedData(generationId, encrypted.keyVersion),
    );
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    const parsed: unknown = JSON.parse(plaintext);

    return parsePayload(parsed);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Observability content payload')
    ) {
      throw error;
    }

    throw new Error('Observability content authentication failed.');
  }
}

export function encryptObservabilityContent(
  configuration: ObservabilityEncryptionConfiguration,
  generationId: string,
  payload: ObservabilityContentPayload,
): EncryptedObservabilityContent {
  const keyVersion = configuration.activeKeyVersion;
  const keyHex = Object.hasOwn(configuration.keys, keyVersion)
    ? configuration.keys[keyVersion]
    : undefined;

  if (typeof keyHex !== 'string') {
    throw new Error('The active observability content key is unavailable.');
  }

  const initializationVector = randomBytes(INITIALIZATION_VECTOR_BYTES);
  const cipher = createCipheriv(
    ALGORITHM,
    Buffer.from(keyHex, 'hex'),
    initializationVector,
    { authTagLength: AUTHENTICATION_TAG_BYTES },
  );

  cipher.setAAD(buildAdditionalAuthenticatedData(generationId, keyVersion));
  const plaintext = JSON.stringify({
    ...payload,
    schemaVersion: PAYLOAD_SCHEMA_VERSION,
  } satisfies PersistedObservabilityContentPayload);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return {
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    initializationVector: initializationVector.toString('base64'),
    keyVersion,
  };
}

function buildAdditionalAuthenticatedData(
  generationId: string,
  keyVersion: string,
): Buffer {
  return Buffer.from(
    `observability-generation-content:v${PAYLOAD_SCHEMA_VERSION}:${generationId}:${keyVersion}`,
    'utf8',
  );
}

function parsePayload(value: unknown): ObservabilityContentPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Observability content payload is invalid.');
  }

  const candidate = value as Record<string, unknown>;

  if (
    candidate.schemaVersion !== PAYLOAD_SCHEMA_VERSION ||
    typeof candidate.outputText !== 'string' ||
    !Array.isArray(candidate.inputMessages) ||
    !candidate.inputMessages.every(isGenerationMessage)
  ) {
    throw new Error('Observability content payload is invalid.');
  }

  return {
    inputMessages: candidate.inputMessages,
    outputText: candidate.outputText,
  };
}

function isGenerationMessage(
  value: unknown,
): value is ObservabilityGenerationMessage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.content === 'string' &&
    (candidate.role === 'assistant' ||
      candidate.role === 'system' ||
      candidate.role === 'tool' ||
      candidate.role === 'user')
  );
}
