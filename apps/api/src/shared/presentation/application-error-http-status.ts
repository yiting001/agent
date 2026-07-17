import { HttpStatus } from '@nestjs/common';

import type { ApplicationError } from '../application/application-error';

const errorStatus: Record<ApplicationError['code'], HttpStatus> = {
  conflict: HttpStatus.CONFLICT,
  forbidden: HttpStatus.FORBIDDEN,
  invalid_operation: HttpStatus.UNPROCESSABLE_ENTITY,
  not_found: HttpStatus.NOT_FOUND,
  service_unavailable: HttpStatus.SERVICE_UNAVAILABLE,
  too_many_requests: HttpStatus.TOO_MANY_REQUESTS,
  unauthorized: HttpStatus.UNAUTHORIZED,
};

export function getApplicationErrorHttpStatus(
  error: ApplicationError,
): HttpStatus {
  return errorStatus[error.code];
}
