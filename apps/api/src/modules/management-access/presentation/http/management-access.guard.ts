import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApplicationError } from '../../../../shared/application/application-error';
import { ManagementAuditService } from '../../application/management-audit.service';
import { ManagementAuthenticator } from '../../application/management-authenticator';
import type {
  ManagementPrincipal,
  ManagementScope,
} from '../../domain/management-access';
import {
  MANAGEMENT_AUDIT_METADATA,
  MANAGEMENT_PRINCIPAL_REQUEST_KEY,
  MANAGEMENT_SCOPES_METADATA,
  type ManagementAuditDefinition,
  type ManagementRequest,
} from './management-access.decorators';
import { sanitizeManagementAuditResourceId } from './management-audit-resource-id';

const MAX_AUTHORIZATION_LENGTH = 300;

/** Accept exactly one Authorization Bearer credential, never query parameters. */
export function readManagementBearerToken(
  authorization: string | undefined,
): string {
  if (!authorization || authorization.length > MAX_AUTHORIZATION_LENGTH) {
    throw new ApplicationError(
      'unauthorized',
      '缺少或无效的管理 Bearer 凭证。',
    );
  }

  const match = /^Bearer ([^\s]+)$/.exec(authorization);

  if (!match?.[1]) {
    throw new ApplicationError(
      'unauthorized',
      '缺少或无效的管理 Bearer 凭证。',
    );
  }

  return match[1];
}

@Injectable()
export class ManagementAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authenticator: ManagementAuthenticator,
    private readonly audit: ManagementAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scopes = this.reflector.getAllAndOverride<ManagementScope[]>(
      MANAGEMENT_SCOPES_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (scopes === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ManagementRequest>();
    const auditDefinition = this.auditDefinition(context);
    let principal: ManagementPrincipal | undefined;

    try {
      principal = this.authenticator.authenticate(
        readManagementBearerToken(request.header('authorization')),
      );
      const granted = new Set(principal.scopes);

      if (scopes.some((scope) => !granted.has(scope))) {
        throw new ApplicationError('forbidden', '管理访问凭证缺少所需权限。');
      }

      request[MANAGEMENT_PRINCIPAL_REQUEST_KEY] = principal;

      return true;
    } catch (error) {
      await this.audit.record({
        action: auditDefinition.action,
        metadata: {
          method: request.method,
          requiredScopes: [...scopes],
          statusCode:
            error instanceof ApplicationError && error.code === 'forbidden'
              ? 403
              : 401,
        },
        resourceId: this.resourceId(auditDefinition, request),
        resourceType: auditDefinition.resourceType,
        result: 'denied',
        subject: principal?.subject ?? 'unknown',
      });
      throw error;
    }
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
