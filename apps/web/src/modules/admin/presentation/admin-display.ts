import type { AgentStatus, ResourceStatus } from '../domain/admin-workspace';

export const agentStatusLabels: Record<AgentStatus, string> = {
  disabled: '已停用',
  draft: '草稿',
  published: '已发布',
};

export const resourceStatusLabels: Record<ResourceStatus, string> = {
  disabled: '已停用',
  processing: '处理中',
  ready: '可用',
};

export function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}
