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

import { ObservabilityService } from '../application/observability.service';
import { ObservabilityContext } from './observability-context';

function readTraceId(request: Request, fallback: string): string {
  const traceParent = request.header('traceparent');
  const traceId = traceParent?.match(
    /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i,
  )?.[1];

  return traceId?.toLowerCase() ?? fallback;
}

function errorStatus(error: unknown, response: Response): number {
  return error instanceof HttpException
    ? error.getStatus()
    : response.statusCode;
}

function normalizeRoute(path: string): string {
  return path
    .replace(
      /\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}(?=\/|$)/gi,
      '/:id',
    )
    .replace(/\/\d+(?=\/|$)/g, '/:id');
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
    const route = normalizeRoute(`${request.baseUrl}${request.path}`);
    const operation = `${request.method} ${route}`;

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
