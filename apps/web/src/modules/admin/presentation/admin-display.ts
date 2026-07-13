import type {
  AgentStatus,
  KnowledgeDocumentStatus,
  ResourceStatus,
} from '../domain/admin-workspace';

export const documentStatusLabels: Record<KnowledgeDocumentStatus, string> = {
  failed: '处理失败',
  processing: '处理中',
  queued: '排队中',
  ready: '可用',
  uploading: '上传中',
};

export const agentStatusLabels: Record<AgentStatus, string> = {
  disabled: '已停用',
  draft: '草稿',
  published: '已发布',
};

export const resourceStatusLabels: Record<ResourceStatus, string> = {
  disabled: '已停用',
  empty: '待上传',
  failed: '处理失败',
  processing: '处理中',
  ready: '可用',
};

export function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

export function formatBytes(value: number): string {
  if (value === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );

  return `${(value / 1024 ** unitIndex).toFixed(unitIndex > 1 ? 1 : 0)} ${units[unitIndex]}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
