/** 可稳定映射为 HTTP 状态码的应用错误分类。 */
export type ApplicationErrorCode =
  | 'conflict'
  | 'invalid_operation'
  | 'not_found'
  | 'service_unavailable'
  | 'too_many_requests'
  | 'unauthorized';

/** 跨模块共享且不暴露基础设施细节的应用错误。 */
export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
