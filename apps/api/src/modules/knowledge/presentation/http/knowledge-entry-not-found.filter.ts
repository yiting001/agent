import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

import { KnowledgeEntryNotFoundError } from '../../domain/knowledge-entry-not-found.error';

/** Translates domain not-found failures into HTTP 404 responses. */
@Catch(KnowledgeEntryNotFoundError)
export class KnowledgeEntryNotFoundFilter implements ExceptionFilter {
  catch(exception: KnowledgeEntryNotFoundError, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.NOT_FOUND)
      .json({
        error: 'Not Found',
        message: exception.message,
        statusCode: HttpStatus.NOT_FOUND,
      });
  }
}
