export type ApplicationErrorCode =
  | 'conflict'
  | 'invalid_operation'
  | 'not_found'
  | 'service_unavailable'
  | 'too_many_requests'
  | 'unauthorized';

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
