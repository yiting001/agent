import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import { ApplicationError } from '../../../../shared/application/application-error';
import type { ManagementAuditService } from '../../application/management-audit.service';
import type { ManagementAuthenticator } from '../../application/management-authenticator';
import type { ManagementPrincipal } from '../../domain/management-access';
import {
  MANAGEMENT_PRINCIPAL_REQUEST_KEY,
  type ManagementRequest,
} from './management-access.decorators';
import {
  ManagementAccessGuard,
  readManagementBearerToken,
} from './management-access.guard';

const TOKEN = `mgmt_${'A'.repeat(43)}`;
const TRACE_ID = 'a'.repeat(32);

interface GuardFixture {
  auditRecord: jest.Mock;
  authenticate: jest.Mock;
  guard: ManagementAccessGuard;
  request: ManagementRequest;
}

function fixture(
  scopes: string[] | undefined,
  principal: ManagementPrincipal | undefined = {
    scopes: ['observability:metrics'],
    subject: 'operator',
  },
  authorization = `Bearer ${TOKEN}`,
): GuardFixture & { context: ExecutionContext } {
  const request = {
    header: jest.fn().mockReturnValue(authorization),
    method: 'GET',
    params: { traceId: TRACE_ID },
  } as unknown as ManagementRequest;
  const handler = (): void => undefined;
  class TestController {}
  const context = {
    getClass: () => TestController,
    getHandler: () => handler,
    switchToHttp: (): { getRequest: () => ManagementRequest } => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValueOnce(scopes).mockReturnValue({
      action: 'trace.read',
      resourceIdParam: 'traceId',
      resourceType: 'trace',
    }),
  } as unknown as Reflector;
  const authenticate = jest.fn().mockReturnValue(principal);
  const auditRecord = jest.fn().mockResolvedValue(undefined);

  return {
    auditRecord,
    authenticate,
    context,
    guard: new ManagementAccessGuard(
      reflector,
      { authenticate } as unknown as ManagementAuthenticator,
      { record: auditRecord } as unknown as ManagementAuditService,
    ),
    request,
  };
}

describe('ManagementAccessGuard', () => {
  it('leaves routes without scope metadata public', async () => {
    const test = fixture(undefined);

    await expect(test.guard.canActivate(test.context)).resolves.toBe(true);
    expect(test.authenticate).not.toHaveBeenCalled();
    expect(test.auditRecord).not.toHaveBeenCalled();
  });

  it('authenticates empty-scope routes and attaches the principal', async () => {
    const test = fixture([]);

    await expect(test.guard.canActivate(test.context)).resolves.toBe(true);
    expect(test.authenticate).toHaveBeenCalledWith(TOKEN);
    expect(test.request[MANAGEMENT_PRINCIPAL_REQUEST_KEY]).toEqual({
      scopes: ['observability:metrics'],
      subject: 'operator',
    });
  });

  it('requires every declared scope', async () => {
    const test = fixture(['observability:content']);

    await expect(test.guard.canActivate(test.context)).rejects.toEqual(
      new ApplicationError('forbidden', '管理访问凭证缺少所需权限。'),
    );
    expect(test.auditRecord).toHaveBeenCalledWith({
      action: 'trace.read',
      metadata: {
        method: 'GET',
        requiredScopes: ['observability:content'],
        statusCode: 403,
      },
      resourceId: TRACE_ID,
      resourceType: 'trace',
      result: 'denied',
      subject: 'operator',
    });
  });

  it('audits invalid credentials without headers or body metadata', async () => {
    const test = fixture([], undefined, 'Basic secret');

    test.request.params.traceId = TOKEN;

    await expect(test.guard.canActivate(test.context)).rejects.toMatchObject({
      code: 'unauthorized',
    });
    expect(test.authenticate).not.toHaveBeenCalled();
    expect(test.auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          method: 'GET',
          requiredScopes: [],
          statusCode: 401,
        },
        resourceId: undefined,
        result: 'denied',
        subject: 'unknown',
      }),
    );
    expect(JSON.stringify(test.auditRecord.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(test.auditRecord.mock.calls)).not.toContain(TOKEN);
  });
});

describe('readManagementBearerToken', () => {
  it('accepts one strict Bearer token', () => {
    expect(readManagementBearerToken(`Bearer ${TOKEN}`)).toBe(TOKEN);
  });

  it.each([undefined, '', `bearer ${TOKEN}`, `Bearer  ${TOKEN}`, 'Bearer a b'])(
    'rejects malformed authorization values',
    (authorization) => {
      expect(() => readManagementBearerToken(authorization)).toThrow(
        ApplicationError,
      );
    },
  );
});
