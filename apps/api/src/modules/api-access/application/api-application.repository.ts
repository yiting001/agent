import type {
  ApiApplication,
  ApiApplicationSummary,
} from '../domain/api-application';

export abstract class ApiApplicationRepository {
  abstract findByKeyHash(keyHash: string): Promise<ApiApplication | undefined>;
  abstract incrementRequestCount(id: string): Promise<void>;
  abstract list(): Promise<ApiApplicationSummary[]>;
  abstract save(application: ApiApplication): Promise<void>;
}
