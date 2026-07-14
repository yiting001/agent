import type {
  ApiApplication,
  ApiApplicationSummary,
} from '../domain/api-application';

/** API 应用凭证的持久化端口。 */
export abstract class ApiApplicationRepository {
  /** 仅通过不可逆摘要查找凭证，仓储不得持久化原始密钥。 */
  abstract findByKeyHash(keyHash: string): Promise<ApiApplication | undefined>;
  /** 原子递增请求次数，避免并发统计丢失。 */
  abstract incrementRequestCount(id: string): Promise<void>;
  abstract list(): Promise<ApiApplicationSummary[]>;
  abstract save(application: ApiApplication): Promise<void>;
}
