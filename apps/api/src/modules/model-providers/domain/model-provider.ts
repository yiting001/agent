/** AES-GCM 密文及其认证元数据。 */
export interface EncryptedCredential {
  /** 用于验证密文完整性和真实性的认证标签。 */
  authTag: string;
  ciphertext: string;
  /** 每次加密随机生成的初始化向量。 */
  initializationVector: string;
}

/** 模型供应商的持久化配置，凭证始终以密文保存。 */
export interface ModelProvider {
  baseUrl: string;
  /** 每百万输入 token 的美元成本，用于估算调用费用。 */
  chatInputCostPerMillionTokens?: number;
  chatModel?: string;
  /** 每百万输出 token 的美元成本，用于估算调用费用。 */
  chatOutputCostPerMillionTokens?: number;
  createdAt: Date;
  /** 加密后的供应商 API 密钥。 */
  credential: EncryptedCredential;
  description: string;
  embeddingDimensions?: number;
  embeddingInputCostPerMillionTokens?: number;
  embeddingModel?: string;
  enabled: boolean;
  id: string;
  /** 供应商预设键，用于选择兼容协议和默认参数。 */
  key: string;
  name: string;
  updatedAt: Date;
}

/** 管理端可见的供应商视图，不包含密文或原始密钥。 */
export interface ModelProviderSummary {
  baseUrl: string;
  chatInputCostPerMillionTokens?: number;
  chatModel?: string;
  chatOutputCostPerMillionTokens?: number;
  /** 表示凭证已保存，不代表凭证当前仍然有效。 */
  configured: boolean;
  description: string;
  embeddingDimensions?: number;
  embeddingInputCostPerMillionTokens?: number;
  embeddingModel?: string;
  enabled: boolean;
  id: string;
  key: string;
  name: string;
  updatedAt: string;
}

/** 模型调用期间使用的解密后配置，只能存在于进程内存。 */
export interface RuntimeModelProvider {
  /** 敏感原始密钥，禁止写入日志、响应或持久化明文。 */
  apiKey: string;
  baseUrl: string;
  chatInputCostPerMillionTokens?: number;
  chatModel?: string;
  chatOutputCostPerMillionTokens?: number;
  embeddingDimensions?: number;
  embeddingInputCostPerMillionTokens?: number;
  embeddingModel?: string;
  id: string;
  key: string;
  name: string;
}
