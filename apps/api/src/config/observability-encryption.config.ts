import { hkdfSync } from 'node:crypto';

const DERIVED_KEY_VERSION = 'credential-derived-v1';
const DERIVATION_SALT = 'agent-key-derivation:v1';
const DERIVATION_CONTEXT = 'observability-generation-content:aes-256-gcm:v1';
const KEY_HEX_LENGTH = 64;
const KEY_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export interface ObservabilityEncryptionConfiguration {
  activeKeyVersion: string;
  keys: Readonly<Record<string, string>>;
}

export interface ObservabilityEncryptionEnvironment {
  activeKeyVersion?: string;
  credentialEncryptionKey?: string;
  serializedKeys?: string;
}

/**
 * 解析版本化正文密钥。独立 keyring 优先作为写入来源，同时保留由根密钥派生的
 * legacy version，以支持从一期共享根密钥平滑轮换。
 */
export function parseObservabilityEncryptionConfiguration(
  environment: ObservabilityEncryptionEnvironment,
): ObservabilityEncryptionConfiguration {
  const configuredKeys = parseSerializedKeys(environment.serializedKeys);

  if (Object.hasOwn(configuredKeys, DERIVED_KEY_VERSION)) {
    throw new Error(
      `OBSERVABILITY_CONTENT_ENCRYPTION_KEYS.${DERIVED_KEY_VERSION} is reserved for the credential-derived fallback.`,
    );
  }

  const derivedKey = deriveCredentialRootKey(
    environment.credentialEncryptionKey,
  );
  const keys: Record<string, string> = { ...configuredKeys };

  if (derivedKey) {
    keys[DERIVED_KEY_VERSION] = derivedKey;
  }

  if (Object.keys(configuredKeys).length === 0) {
    if (!derivedKey) {
      throw new Error(
        'OBSERVABILITY_CONTENT_ENCRYPTION_KEYS or CREDENTIAL_ENCRYPTION_KEY is required.',
      );
    }

    if (
      environment.activeKeyVersion &&
      environment.activeKeyVersion !== DERIVED_KEY_VERSION
    ) {
      throw new Error(
        `OBSERVABILITY_CONTENT_ENCRYPTION_ACTIVE_KEY_VERSION must be ${DERIVED_KEY_VERSION} when the credential-derived fallback is used.`,
      );
    }

    return { activeKeyVersion: DERIVED_KEY_VERSION, keys };
  }

  const activeKeyVersion = environment.activeKeyVersion?.trim();

  if (!activeKeyVersion || !KEY_VERSION_PATTERN.test(activeKeyVersion)) {
    throw new Error(
      'OBSERVABILITY_CONTENT_ENCRYPTION_ACTIVE_KEY_VERSION must name a configured key version.',
    );
  }

  if (!Object.hasOwn(configuredKeys, activeKeyVersion)) {
    throw new Error(
      'OBSERVABILITY_CONTENT_ENCRYPTION_ACTIVE_KEY_VERSION is not present in OBSERVABILITY_CONTENT_ENCRYPTION_KEYS.',
    );
  }

  return { activeKeyVersion, keys };
}

function deriveCredentialRootKey(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  assertHexKey('CREDENTIAL_ENCRYPTION_KEY', normalized);

  return Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(normalized, 'hex'),
      Buffer.from(DERIVATION_SALT, 'utf8'),
      Buffer.from(DERIVATION_CONTEXT, 'utf8'),
      32,
    ),
  ).toString('hex');
}

function parseSerializedKeys(
  value: string | undefined,
): Record<string, string> {
  const normalized = value?.trim();

  if (!normalized) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized) as unknown;
  } catch {
    throw new Error(
      'OBSERVABILITY_CONTENT_ENCRYPTION_KEYS must be a JSON object.',
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      'OBSERVABILITY_CONTENT_ENCRYPTION_KEYS must be a JSON object.',
    );
  }

  const keys: Record<string, string> = {};

  for (const [version, candidate] of Object.entries(parsed)) {
    if (!KEY_VERSION_PATTERN.test(version)) {
      throw new Error(
        'OBSERVABILITY_CONTENT_ENCRYPTION_KEYS contains an invalid key version.',
      );
    }

    if (typeof candidate !== 'string') {
      throw new Error(
        `OBSERVABILITY_CONTENT_ENCRYPTION_KEYS.${version} must be a 64-character hexadecimal key.`,
      );
    }

    assertHexKey(`OBSERVABILITY_CONTENT_ENCRYPTION_KEYS.${version}`, candidate);
    keys[version] = candidate.toLowerCase();
  }

  if (Object.keys(keys).length === 0) {
    throw new Error(
      'OBSERVABILITY_CONTENT_ENCRYPTION_KEYS must contain at least one key.',
    );
  }

  return keys;
}

function assertHexKey(name: string, value: string): void {
  if (value.length !== KEY_HEX_LENGTH || !/^[\da-f]+$/i.test(value)) {
    throw new Error(`${name} must be a 64-character hexadecimal key.`);
  }
}
