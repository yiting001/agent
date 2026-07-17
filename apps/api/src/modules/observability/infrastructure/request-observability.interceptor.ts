import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable, Subscription } from 'rxjs';
import { Observable as RxObservable } from 'rxjs';
import { performance } from 'node:perf_hooks';

import { ApplicationError } from '../../../shared/application/application-error';
import { getApplicationErrorHttpStatus } from '../../../shared/presentation/application-error-http-status';
import { ObservabilityService } from '../application/observability.service';
import { ObservabilityContext } from './observability-context';

const UNMATCHED_ROUTE = '/unmatched';
const MAX_ROUTE_TEMPLATE_CHARACTERS = 500;

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);

    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}

function readTraceId(request: Request, fallback: string): string {
  const traceParent = request.header('traceparent');
  const traceId = traceParent?.match(
    /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i,
  )?.[1];

  return traceId?.toLowerCase() ?? fallback;
}

function errorStatus(error: unknown, response: Response): number {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  if (error instanceof ApplicationError) {
    return getApplicationErrorHttpStatus(error);
  }

  return response.headersSent ? response.statusCode : 500;
}

function readMatchedRouteTemplate(request: Request): string {
  const route: unknown = (request as unknown as { route?: unknown }).route;

  if (typeof route !== 'object' || route === null || Array.isArray(route)) {
    return UNMATCHED_ROUTE;
  }

  const path = (route as Record<string, unknown>).path;

  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.length > MAX_ROUTE_TEMPLATE_CHARACTERS ||
    containsControlCharacter(path)
  ) {
    return UNMATCHED_ROUTE;
  }

  return path;
}

function isObservabilityReadRoute(route: string): boolean {
  return (
    route.startsWith('/api/observability/') ||
    route.startsWith('/observability/')
  );
}

@Injectable()
export class RequestObservabilityInterceptor implements NestInterceptor {
  constructor(
    private readonly observability: ObservabilityService,
    private readonly context: ObservabilityContext,
  ) {}

  intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (executionContext.getType() !== 'http') {
      return next.handle();
    }

    const http = executionContext.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const traceId = readTraceId(request, this.observability.createTraceId());
    const spanId = this.observability.createSpanId();
    const startedAt = new Date();
    const started = performance.now();
    const route = readMatchedRouteTemplate(request);
    const operation = `${request.method} ${route}`;

    if (request.method === 'GET' && isObservabilityReadRoute(route)) {
      return next.handle();
    }

    response.setHeader('X-Trace-Id', traceId);

    return new RxObservable((subscriber) => {
      let subscription: Subscription | undefined;

      this.context.run({ spanId, traceId }, () => {
        subscription = next.handle().subscribe({
          complete: () => {
            void this.observability
              .record({
                category: 'http',
                durationMs: performance.now() - started,
                method: request.method,
                operation,
                route,
                spanId,
                startedAt,
                status: response.statusCode >= 500 ? 'error' : 'ok',
                statusCode: response.statusCode,
                traceId,
              })
              .then(() => subscriber.complete());
          },
          error: (error: unknown) => {
            const statusCode = errorStatus(error, response);

            void this.observability
              .record({
                category: 'http',
                durationMs: performance.now() - started,
                errorMessage:
                  error instanceof Error ? error.message : '未知请求错误',
                method: request.method,
                operation,
                route,
                spanId,
                startedAt,
                status: 'error',
                statusCode,
                traceId,
              })
              .then(() => subscriber.error(error));
          },
          next: (value) => subscriber.next(value),
        });
      });

      return () => subscription?.unsubscribe();
    });
  }
}
