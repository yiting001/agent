/** 服务端签发的匿名记忆主体凭证及其稳定隔离键。 */
export abstract class MemoryOwnerIdentity {
  /** 签发不可伪造的匿名 bearer token。 */
  abstract issue(): string;

  /** 校验 token 并派生不暴露 token 本身的持久化 ownerKey。 */
  abstract resolve(token: string): string;
}
