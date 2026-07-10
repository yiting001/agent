export interface EncryptedCredential {
  authTag: string;
  ciphertext: string;
  initializationVector: string;
}

export interface ModelProvider {
  baseUrl: string;
  chatModel?: string;
  createdAt: Date;
  credential: EncryptedCredential;
  description: string;
  embeddingDimensions?: number;
  embeddingModel?: string;
  enabled: boolean;
  id: string;
  key: string;
  name: string;
  updatedAt: Date;
}

export interface ModelProviderSummary {
  baseUrl: string;
  chatModel?: string;
  configured: boolean;
  description: string;
  embeddingDimensions?: number;
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
  chatModel?: string;
  embeddingDimensions?: number;
  embeddingModel?: string;
  id: string;
}
