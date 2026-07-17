import { applicationConfig } from './application.config';

describe('application configuration', () => {
  const originalCredentialEncryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  const originalDatabaseSynchronize = process.env.DATABASE_SYNCHRONIZE;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalObservabilityActiveKeyVersion =
    process.env.OBSERVABILITY_CONTENT_ENCRYPTION_ACTIVE_KEY_VERSION;
  const originalObservabilityEncryptionKeys =
    process.env.OBSERVABILITY_CONTENT_ENCRYPTION_KEYS;
  const originalCaptureMode = process.env.OBSERVABILITY_CONTENT_CAPTURE_MODE;
  const originalRedisUrl = process.env.REDIS_URL;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.CREDENTIAL_ENCRYPTION_KEY = '11'.repeat(32);
    delete process.env.DATABASE_SYNCHRONIZE;
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.OBSERVABILITY_CONTENT_ENCRYPTION_ACTIVE_KEY_VERSION;
    delete process.env.OBSERVABILITY_CONTENT_ENCRYPTION_KEYS;
    delete process.env.OBSERVABILITY_CONTENT_CAPTURE_MODE;
  });

  afterAll(() => {
    restoreEnvironment(
      'CREDENTIAL_ENCRYPTION_KEY',
      originalCredentialEncryptionKey,
    );
    restoreEnvironment('DATABASE_SYNCHRONIZE', originalDatabaseSynchronize);
    restoreEnvironment('DATABASE_URL', originalDatabaseUrl);
    restoreEnvironment('NODE_ENV', originalNodeEnv);
    restoreEnvironment(
      'OBSERVABILITY_CONTENT_ENCRYPTION_ACTIVE_KEY_VERSION',
      originalObservabilityActiveKeyVersion,
    );
    restoreEnvironment(
      'OBSERVABILITY_CONTENT_ENCRYPTION_KEYS',
      originalObservabilityEncryptionKeys,
    );
    restoreEnvironment(
      'OBSERVABILITY_CONTENT_CAPTURE_MODE',
      originalCaptureMode,
    );
    restoreEnvironment('REDIS_URL', originalRedisUrl);
  });

  it('requires PostgreSQL and Redis in production', () => {
    expect(() => applicationConfig()).toThrow('DATABASE_URL is required.');

    process.env.DATABASE_URL = 'postgresql://agent:agent@127.0.0.1:5432/agent';

    expect(() => applicationConfig()).toThrow(
      'REDIS_URL is required in production.',
    );
  });

  it('rejects synchronize in production', () => {
    process.env.DATABASE_SYNCHRONIZE = 'true';
    process.env.DATABASE_URL = 'postgresql://agent:agent@127.0.0.1:5432/agent';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';

    expect(() => applicationConfig()).toThrow(
      'DATABASE_SYNCHRONIZE must be false in production.',
    );
  });

  it('rejects non-PostgreSQL database URLs', () => {
    process.env.DATABASE_URL = 'https://database.example.com/agent';

    expect(() => applicationConfig()).toThrow(
      'DATABASE_URL must be a valid URL.',
    );
  });

  it('defaults generation content capture to redacted and rejects full mode', () => {
    process.env.NODE_ENV = 'test';

    expect(applicationConfig().observabilityContentCaptureMode).toBe(
      'redacted',
    );

    process.env.OBSERVABILITY_CONTENT_CAPTURE_MODE = 'full';

    expect(() => applicationConfig()).toThrow(
      'OBSERVABILITY_CONTENT_CAPTURE_MODE must be off or redacted.',
    );
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
