import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApplicationError } from '../../../../shared/application/application-error';
import type {
  ManagementPrincipal,
  ManagementScope,
} from '../../domain/management-access';

export const MANAGEMENT_SCOPES_METADATA = Symbol('management-scopes');
export const MANAGEMENT_AUDIT_METADATA = Symbol('management-audit');
export const MANAGEMENT_PRINCIPAL_REQUEST_KEY = Symbol('management-principal');

export interface ManagementAuditDefinition {
  action: string;
  /** Optional route parameter name; request headers and bodies are never read. */
  resourceIdParam?: string;
  resourceType: string;
}

export type ManagementRequest = Request & {
  [MANAGEMENT_PRINCIPAL_REQUEST_KEY]?: ManagementPrincipal;
};

/** Empty scopes still opt the route into management credential authentication. */
export function RequireManagementScopes(
  ...scopes: ManagementScope[]
): MethodDecorator & ClassDecorator {
  return SetMetadata(MANAGEMENT_SCOPES_METADATA, scopes);
}

/** Static resource metadata avoids reading sensitive request or response payloads. */
export function AuditManagementAction(
  definition: ManagementAuditDefinition,
): MethodDecorator & ClassDecorator {
  return SetMetadata(MANAGEMENT_AUDIT_METADATA, definition);
}

export const CurrentManagementPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ManagementPrincipal => {
    const request = context.switchToHttp().getRequest<ManagementRequest>();
    const principal = request[MANAGEMENT_PRINCIPAL_REQUEST_KEY];

    if (!principal) {
      throw new ApplicationError('unauthorized', '管理访问主体不可用。');
    }

    return principal;
  },
);
