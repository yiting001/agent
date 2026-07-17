import type { ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { lastValueFrom, of } from 'rxjs';

import { MANAGEMENT_PRINCIPAL_REQUEST_KEY } from '../../management-access/presentation/http/management-access.decorators';
import type { ObservabilityService } from '../application/observability.service';
import type { ObservabilityContext } from './observability-context';
import { RequestObservabilityInterceptor } from './request-observability.interceptor';

const TOKEN = `mgmt_${'A'.repeat(43)}`;

interface RequestFixture {
  context: ExecutionContext;
  interceptor: RequestObservabilityInterceptor;
  record: jest.Mock;
}

function fixture(routeTemplate: string | undefined): RequestFixture {
  const request = {
    [MANAGEMENT_PRINCIPAL_REQUEST_KEY]: {
      scopes: ['observability:feedback'],
      subject: 'reviewer',
    },
    baseUrl: '',
    header: jest.fn((name: string) =>
      name === 'authorization' ? `Bearer ${TOKEN}` : undefined,
    ),
    method: 'POST',
    path: `/api/observability/feedback-reviews/${TOKEN}/evaluation-case`,
    route: routeTemplate ? { path: routeTemplate } : undefined,
  } as unknown as Request;
  const response = {
    headersSent: false,
    setHeader: jest.fn(),
    statusCode: 201,
  } as unknown as Response;
  const http = {
    getRequest: (): Request => request,
    getResponse: (): Response => response,
  };
  const context = {
    getType: (): 'http' => 'http',
    switchToHttp: (): typeof http => http,
  } as unknown as ExecutionContext;
  const record = jest.fn().mockResolvedValue(undefined);
  const observability = {
    createSpanId: () => 'span-id',
    createTraceId: () => 'trace-id',
    record,
  } as unknown as ObservabilityService;
  const observabilityContext = {
    run: <Output>(_context: unknown, operation: () => Output): Output =>
      operation(),
  } as unknown as ObservabilityContext;

  return {
    context,
    interceptor: new RequestObservabilityInterceptor(
      observability,
      observabilityContext,
    ),
    record,
  };
}

describe('RequestObservabilityInterceptor', () => {
  it('persists the matched route template instead of untrusted path parameters', async () => {
    const route =
      '/api/observability/feedback-reviews/:feedbackId/evaluation-case';
    const test = fixture(route);

    await lastValueFrom(
      test.interceptor.intercept(test.context, { handle: () => of({}) }),
    );

    expect(test.record).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: `POST ${route}`,
        route,
      }),
    );
    expect(JSON.stringify(test.record.mock.calls)).not.toContain(TOKEN);
  });

  it('uses a fixed safe route when matched route metadata is unavailable', async () => {
    const test = fixture(undefined);

    await lastValueFrom(
      test.interceptor.intercept(test.context, { handle: () => of({}) }),
    );

    expect(test.record).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'POST /unmatched',
        route: '/unmatched',
      }),
    );
    expect(JSON.stringify(test.record.mock.calls)).not.toContain(TOKEN);
  });
});
