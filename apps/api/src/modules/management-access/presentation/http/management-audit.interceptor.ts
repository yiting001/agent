import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { catchError, from, map, mergeMap, throwError } from 'rxjs';

import { ApplicationError } from '../../../../shared/application/application-error';
import { getApplicationErrorHttpStatus } from '../../../../shared/presentation/application-error-http-status';
import { ManagementAuditService } from '../../application/management-audit.service';
import type { ManagementScope } from '../../domain/management-access';
import {
  MANAGEMENT_AUDIT_METADATA,
  MANAGEMENT_PRINCIPAL_REQUEST_KEY,
  MANAGEMENT_SCOPES_METADATA,
  type ManagementAuditDefinition,
  type ManagementRequest,
} from './management-access.decorators';
import { sanitizeManagementAuditResourceId } from './management-audit-resource-id';

@Injectable()
export class ManagementAuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: ManagementAuditService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const scopes = this.reflector.getAllAndOverride<ManagementScope[]>(
      MANAGEMENT_SCOPES_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (scopes === undefined || context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<ManagementRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const principal = request[MANAGEMENT_PRINCIPAL_REQUEST_KEY];

    if (!principal) {
      return next.handle();
    }

    const definition = this.auditDefinition(context);
    const baseInput = {
      action: definition.action,
      metadata: {
        method: request.method,
        requiredScopes: [...scopes],
      },
      resourceId: this.resourceId(definition, request),
      resourceType: definition.resourceType,
      subject: principal.subject,
    };

    return next.handle().pipe(
      mergeMap((value) =>
        from(
          this.audit.record({
            ...baseInput,
            metadata: {
              ...baseInput.metadata,
              statusCode: response.statusCode,
            },
            result: 'succeeded',
          }),
        ).pipe(map(() => value)),
      ),
      catchError((error: unknown) =>
        from(
          this.audit.record({
            ...baseInput,
            metadata: {
              ...baseInput.metadata,
              statusCode: this.errorStatus(error),
            },
            result: 'failed',
          }),
        ).pipe(mergeMap(() => throwError(() => error))),
      ),
    );
  }

  private auditDefinition(
    context: ExecutionContext,
  ): ManagementAuditDefinition {
    return (
      this.reflector.getAllAndOverride<ManagementAuditDefinition>(
        MANAGEMENT_AUDIT_METADATA,
        [context.getHandler(), context.getClass()],
      ) ?? {
        action: `${context.getClass().name}.${context.getHandler().name}`,
        resourceType: context.getClass().name,
      }
    );
  }

  private errorStatus(error: unknown): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    if (error instanceof ApplicationError) {
      return getApplicationErrorHttpStatus(error);
    }

    return 500;
  }

  private resourceId(
    definition: ManagementAuditDefinition,
    request: ManagementRequest,
  ): string | undefined {
    return sanitizeManagementAuditResourceId(
      definition.resourceIdParam,
      definition.resourceIdParam
        ? request.params[definition.resourceIdParam]
        : undefined,
    );
  }
}
