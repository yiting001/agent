import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import { HmacMemoryOwnerIdentity } from './hmac-memory-owner-identity';

function createIdentity(key = 'ab'.repeat(32)): HmacMemoryOwnerIdentity {
  return new HmacMemoryOwnerIdentity(
    new ConfigService({
      application: {
        credentialEncryptionKey: key,
      } satisfies Partial<ApplicationConfig>,
    }),
  );
}

describe('HmacMemoryOwnerIdentity', () => {
  it('为同一 token 派生稳定且不暴露 token 的 ownerKey', () => {
    const identity = createIdentity();
    const token = identity.issue();
    const ownerKey = identity.resolve(token);

    expect(identity.resolve(token)).toBe(ownerKey);
    expect(ownerKey).toMatch(/^[a-f0-9]{64}$/);
    expect(token).not.toContain(ownerKey);
  });

  it('拒绝被修改或由其他根密钥签发的 token', () => {
    const identity = createIdentity();
    const token = identity.issue();
    const [version, subject] = token.split('.');
    const tampered = `${version}.${subject}.invalid`;

    expect(() => identity.resolve(tampered)).toThrow(ApplicationError);
    expect(() => createIdentity('cd'.repeat(32)).resolve(token)).toThrow(
      ApplicationError,
    );
  });
});
