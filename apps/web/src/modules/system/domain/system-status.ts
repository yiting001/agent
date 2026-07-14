/** 系统模块展示的 API 存活状态。 */
export interface SystemStatus {
  readonly service: string;
  readonly status: 'ok';
  readonly timestamp: string;
}
