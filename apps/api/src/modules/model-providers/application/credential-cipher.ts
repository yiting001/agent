import type { EncryptedCredential } from '../domain/model-provider';

export abstract class CredentialCipher {
  abstract decrypt(credential: EncryptedCredential): string;
  abstract encrypt(plaintext: string): EncryptedCredential;
}
