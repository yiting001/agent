export interface EncryptedCredential {
  authTag: string;
  ciphertext: string;
  initializationVector: string;
}

export interface ModelProvider {
  baseUrl: string;
  chatInputCostPerMillionTokens?: number;
  chatModel?: string;
  chatOutputCostPerMillionTokens?: number;
  createdAt: Date;
  credential: EncryptedCredential;
  description: string;
  embeddingDimensions?: number;
  embeddingInputCostPerMillionTokens?: number;
  embeddingModel?: string;
  enabled: boolean;
  id: string;
  key: string;
  name: string;
  updatedAt: Date;
}

export interface ModelProviderSummary {
  baseUrl: string;
  chatInputCostPerMillionTokens?: number;
  chatModel?: string;
  chatOutputCostPerMillionTokens?: number;
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

export interface RuntimeModelProvider {
  apiKey: string;
  baseUrl: string;
  chatInputCostPerMillionTokens?: number;
  chatModel?: string;
  chatOutputCostPerMillionTokens?: number;
  embeddingDimensions?: number;
  embeddingInputCostPerMillionTokens?: number;
  embeddingModel?: string;
  id: string;
}
