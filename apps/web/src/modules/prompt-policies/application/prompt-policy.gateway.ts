import type {
  PromptPolicy,
  UpdatePromptPolicyInput,
} from '../domain/prompt-policy';

/** 内置提示词管理的前端应用端口。 */
export abstract class PromptPolicyGateway {
  abstract list(): Promise<PromptPolicy[]>;
  abstract update(
    id: string,
    input: UpdatePromptPolicyInput,
  ): Promise<PromptPolicy>;
}
