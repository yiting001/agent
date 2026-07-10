import type { ModelProvider } from '../domain/model-provider';

export abstract class ModelProviderRepository {
  abstract findById(id: string): Promise<ModelProvider | undefined>;
  abstract findByKey(key: string): Promise<ModelProvider | undefined>;
  abstract list(): Promise<ModelProvider[]>;
  abstract save(provider: ModelProvider): Promise<void>;
}
