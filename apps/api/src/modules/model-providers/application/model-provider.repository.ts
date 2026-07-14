import type { ModelProvider } from '../domain/model-provider';

/** 模型供应商聚合的持久化端口。 */
export abstract class ModelProviderRepository {
  abstract findById(id: string): Promise<ModelProvider | undefined>;
  abstract findByKey(key: string): Promise<ModelProvider | undefined>;
  abstract list(): Promise<ModelProvider[]>;
  abstract save(provider: ModelProvider): Promise<void>;
}
