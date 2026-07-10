import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

import { ApplicationError } from '../application/application-error';

const errorStatus: Record<ApplicationError['code'], HttpStatus> = {
  conflict: HttpStatus.CONFLICT,
  invalid_operation: HttpStatus.UNPROCESSABLE_ENTITY,
  not_found: HttpStatus.NOT_FOUND,
  service_unavailable: HttpStatus.SERVICE_UNAVAILABLE,
  unauthorized: HttpStatus.UNAUTHORIZED,
};

@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  catch(exception: ApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(errorStatus[exception.code]).json({
      code: exception.code,
      message: exception.message,
    });
  }
}
