import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

import { ApplicationError } from '../application/application-error';
import { getApplicationErrorHttpStatus } from './application-error-http-status';

@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  catch(exception: ApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(getApplicationErrorHttpStatus(exception)).json({
      code: exception.code,
      message: exception.message,
    });
  }
}
