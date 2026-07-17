import { registerAs } from '@nestjs/config';
import { createHash } from 'node:crypto';

import {
  MANAGEMENT_SCOPES,
  type ManagementScope,
} from '../modules/management-access/domain/management-access';

const MANAGEMENT_TOKEN_PATTERN = /^mgmt_[A-Za-z0-9_-]{43,251}$/;
const SUBJECT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;

export interface ManagementCredentialConfig {
  scopes: ManagementScope[];
  subject: string;
  /** SHA-256 only; the raw bearer credential must not leave process.env. */
  tokenHash: string;
}

export interface ManagementSecurityConfig {
  credentials: ManagementCredentialConfig[];
}

interface RawManagementCredential {
  scopes?: unknown;
  subject?: unknown;
  token?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidCredentials(reason: string): Error {
  return new Error(`MANAGEMENT_ACCESS_CREDENTIALS ${reason}.`);
}

function parseScopes(value: unknown, index: number): ManagementScope[] {
  if (!Array.isArray(value)) {
    throw invalidCredentials(`entry ${index} scopes must be an array`);
  }

  const allowed = new Set<string>(MANAGEMENT_SCOPES);
  const scopes = value.map((scope) => {
    if (typeof scope !== 'string' || !allowed.has(scope)) {
      throw invalidCredentials(`entry ${index} contains an unsupported scope`);
    }

    return scope as ManagementScope;
  });

  return [...new Set(scopes)];
}

function parseCredential(
  value: unknown,
  index: number,
): ManagementCredentialConfig {
  if (!isRecord(value)) {
    throw invalidCredentials(`entry ${index} must be an object`);
  }

  const raw = value as RawManagementCredential;
  const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';

  if (!SUBJECT_PATTERN.test(subject)) {
    throw invalidCredentials(`entry ${index} subject is invalid`);
  }

  if (
    typeof raw.token !== 'string' ||
    !MANAGEMENT_TOKEN_PATTERN.test(raw.token)
  ) {
    throw invalidCredentials(
      `entry ${index} token must be a high-entropy mgmt_ credential`,
    );
  }

  return {
    scopes: parseScopes(raw.scopes, index),
    subject,
    tokenHash: createHash('sha256').update(raw.token).digest('hex'),
  };
}

/** Parse management credentials without retaining raw bearer tokens in config. */
export function parseManagementSecurityConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ManagementSecurityConfig {
  const serialized = environment.MANAGEMENT_ACCESS_CREDENTIALS?.trim();

  if (!serialized) {
    if (environment.NODE_ENV === 'production') {
      throw invalidCredentials('must contain at least one entry in production');
    }

    return { credentials: [] };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw invalidCredentials('must be valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw invalidCredentials('must be a JSON array');
  }

  if (environment.NODE_ENV === 'production' && parsed.length === 0) {
    throw invalidCredentials('must contain at least one entry in production');
  }

  const credentials = parsed.map(parseCredential);
  const subjects = new Set<string>();
  const tokenHashes = new Set<string>();

  for (const credential of credentials) {
    if (subjects.has(credential.subject)) {
      throw invalidCredentials('subjects must be unique');
    }

    if (tokenHashes.has(credential.tokenHash)) {
      throw invalidCredentials('tokens must be unique');
    }

    subjects.add(credential.subject);
    tokenHashes.add(credential.tokenHash);
  }

  return { credentials };
}

export const managementSecurityConfig = registerAs(
  'managementSecurity',
  parseManagementSecurityConfig,
);
