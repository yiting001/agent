import type { HttpClient } from '@/shared/http/http-client';

import { PromptPolicyGateway } from '../application/prompt-policy.gateway';
import type {
  PromptPolicy,
  UpdatePromptPolicyInput,
} from '../domain/prompt-policy';

/** 通过管理 API 读取和更新系统内置提示词。 */
export class HttpPromptPolicyGateway extends PromptPolicyGateway {
  constructor(private readonly httpClient: Pick<HttpClient, 'get' | 'put'>) {
    super();
  }

  list(): Promise<PromptPolicy[]> {
    return this.httpClient.get<PromptPolicy[]>('/prompt-policies');
  }

  update(id: string, input: UpdatePromptPolicyInput): Promise<PromptPolicy> {
    return this.httpClient.put<PromptPolicy, UpdatePromptPolicyInput>(
      `/prompt-policies/${id}`,
      input,
    );
  }
}
