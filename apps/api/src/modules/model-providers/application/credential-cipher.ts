import type { EncryptedCredential } from '../domain/model-provider';

/** 供应商密钥的加密端口，领域和应用层不依赖具体密码库。 */
export abstract class CredentialCipher {
  /** 验证密文完整性后返回仅供运行时使用的明文。 */
  abstract decrypt(credential: EncryptedCredential): string;
  /** 使用随机初始化向量生成带认证标签的密文。 */
  abstract encrypt(plaintext: string): EncryptedCredential;
}
