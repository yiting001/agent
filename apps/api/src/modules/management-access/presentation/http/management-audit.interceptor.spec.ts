import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { lastValueFrom, of, throwError } from 'rxjs';

import { ApplicationError } from '../../../../shared/application/application-error';
import type {
  ManagementAuditService,
  RecordManagementAuditInput,
} from '../../application/management-audit.service';
import {
  MANAGEMENT_AUDIT_METADATA,
  MANAGEMENT_PRINCIPAL_REQUEST_KEY,
  MANAGEMENT_SCOPES_METADATA,
  type ManagementRequest,
} from './management-access.decorators';
import { ManagementAuditInterceptor } from './management-audit.interceptor';

interface InterceptorFixture {
  context: ExecutionContext;
  interceptor: ManagementAuditInterceptor;
  records: RecordManagementAuditInput[];
  request: ManagementRequest;
}

const FEEDBACK_ID = '00000000-0000-4000-8000-000000000001';

function fixture(statusCode = 200): InterceptorFixture {
  const handler = (): void => undefined;
  class TestController {}

  Reflect.defineMetadata(
    MANAGEMENT_SCOPES_METADATA,
    ['observability:feedback'],
    handler,
  );
  Reflect.defineMetadata(
    MANAGEMENT_AUDIT_METADATA,
    {
      action: 'feedback.decide',
      resourceIdParam: 'feedbackId',
      resourceType: 'observability-feedback',
    },
    handler,
  );

  const request = {
    [MANAGEMENT_PRINCIPAL_REQUEST_KEY]: {
      scopes: ['observability:feedback'],
      subject: 'reviewer',
    },
    method: 'POST',
    params: { feedbackId: FEEDBACK_ID },
  } as unknown as ManagementRequest;
  const response = { statusCode } as Response;
  const http = {
    getRequest: (): ManagementRequest => request,
    getResponse: (): Response => response,
  };
  const context = {
    getClass: (): typeof TestController => TestController,
    getHandler: (): typeof handler => handler,
    getType: (): 'http' => 'http',
    switchToHttp: (): typeof http => http,
  } as unknown as ExecutionContext;
  const records: RecordManagementAuditInput[] = [];
  const audit = {
    record: (input: RecordManagementAuditInput): Promise<void> => {
      records.push(input);
      return Promise.resolve();
    },
  } as unknown as ManagementAuditService;

  return {
    context,
    interceptor: new ManagementAuditInterceptor(new Reflector(), audit),
    records,
    request,
  };
}

describe('ManagementAuditInterceptor', () => {
  it('records successful protected requests without request content', async () => {
    const test = fixture(201);
    const next = {
      handle: () => of({ accepted: true }),
    } as CallHandler<unknown>;

    await expect(
      lastValueFrom(test.interceptor.intercept(test.context, next)),
    ).resolves.toEqual({ accepted: true });
    expect(test.records).toEqual([
      {
        action: 'feedback.decide',
        metadata: {
          method: 'POST',
          requiredScopes: ['observability:feedback'],
          statusCode: 201,
        },
        resourceId: FEEDBACK_ID,
        resourceType: 'observability-feedback',
        result: 'succeeded',
        subject: 'reviewer',
      },
    ]);
  });

  it('records a safe status for failed protected requests', async () => {
    const test = fixture();
    const error = new ApplicationError('conflict', '状态已改变。');
    const next = {
      handle: () => throwError(() => error),
    } as CallHandler<unknown>;

    await expect(
      lastValueFrom(test.interceptor.intercept(test.context, next)),
    ).rejects.toBe(error);
    expect(test.records).toEqual([
      {
        action: 'feedback.decide',
        metadata: {
          method: 'POST',
          requiredScopes: ['observability:feedback'],
          statusCode: 409,
        },
        resourceId: FEEDBACK_ID,
        resourceType: 'observability-feedback',
        result: 'failed',
        subject: 'reviewer',
      },
    ]);
  });

  it('omits untrusted content disguised as a resource identifier', async () => {
    const test = fixture();
    const untrustedContent = '未经脱敏的用户正文';
    const next = {
      handle: () => of({ accepted: true }),
    } as CallHandler<unknown>;

    test.request.params.feedbackId = untrustedContent;

    await lastValueFrom(test.interceptor.intercept(test.context, next));

    expect(test.records).toEqual([
      expect.objectContaining({ resourceId: undefined }),
    ]);
    expect(JSON.stringify(test.records)).not.toContain(untrustedContent);
  });
});
