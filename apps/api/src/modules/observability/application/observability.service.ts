import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import type { ApplicationConfig } from '../../../config/application.config';
import type {
  ObservabilityAlertSeverity,
  ObservabilityCategory,
  ObservabilityEvent,
  ObservabilityStatus,
  TokenCountSource,
} from '../domain/observability-event';
import { ObservabilityContext } from '../infrastructure/observability-context';
import { ObservabilityEventRepository } from './observability-event.repository';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1_000;
const MAX_ERROR_MESSAGE_LENGTH = 1_000;

export interface RecordObservabilityEvent {
  agentId?: string;
  category: ObservabilityCategory;
  costUsdMicros?: number;
  durationMs: number;
  errorMessage?: string;
  inputTokens?: number;
  metadata?: Record<string, string | number | boolean>;
  method?: string;
  model?: string;
  operation: string;
  outputTokens?: number;
  parentSpanId?: string;
  providerId?: string;
  route?: string;
  spanId?: string;
  startedAt: Date;
  status: ObservabilityStatus;
  statusCode?: number;
  tokenCountSource?: TokenCountSource;
  traceId?: string;
}

export type TrackOperationInput = Omit<
  RecordObservabilityEvent,
  'durationMs' | 'errorMessage' | 'startedAt' | 'status'
>;

@Injectable()
export class ObservabilityService {
  private readonly highCostUsdMicros: number;
  private readonly logger = new Logger('Observability');
  private readonly retentionDays: number;
  private readonly slowModelMs: number;
  private readonly slowRequestMs: number;
  private lastCleanupAt = 0;

  constructor(
    private readonly repository: ObservabilityEventRepository,
    private readonly context: ObservabilityContext,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.highCostUsdMicros = Math.round(
      config.observabilityHighCostUsd * 1_000_000,
    );
    this.retentionDays = config.observabilityRetentionDays;
    this.slowModelMs = config.observabilitySlowModelMs;
    this.slowRequestMs = config.observabilitySlowRequestMs;
  }

  async record(input: RecordObservabilityEvent): Promise<void> {
    const current = this.context.current();
    const costUsdMicros = input.costUsdMicros ?? 0;
    const alert = this.resolveAlert(input, costUsdMicros);
    const event: ObservabilityEvent = {
      agentId: input.agentId ?? current?.agentId,
      alertMessage: alert?.message,
      alertSeverity: alert?.severity,
      category: input.category,
      costUsdMicros,
      durationMs: Math.max(0, input.durationMs),
      errorMessage: this.normalizeError(input.errorMessage),
      id: randomUUID(),
      inputTokens: input.inputTokens ?? 0,
      metadata: {
        ...(current?.source ? { source: current.source } : {}),
        ...input.metadata,
      },
      method: input.method,
      model: input.model,
      operation: input.operation,
      outputTokens: input.outputTokens ?? 0,
      parentSpanId:
        input.parentSpanId ??
        (input.spanId === current?.spanId ? undefined : current?.spanId),
      providerId: input.providerId,
      route: input.route,
      spanId: input.spanId ?? this.createSpanId(),
      startedAt: input.startedAt,
      status: input.status,
      statusCode: input.statusCode,
      tokenCountSource: input.tokenCountSource ?? 'unavailable',
      traceId: input.traceId ?? current?.traceId ?? this.createTraceId(),
    };

    try {
      await this.repository.save(event);
      this.writeStructuredLog(event);
      await this.cleanupIfDue();
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : 'unknown observability persistence error',
          operation: event.operation,
          traceId: event.traceId,
        }),
      );
    }
  }

  async track<Output>(
    input: TrackOperationInput,
    operation: () => Promise<Output>,
  ): Promise<Output> {
    const startedAt = new Date();
    const started = performance.now();

    try {
      const output = await operation();

      await this.record({
        ...input,
        durationMs: performance.now() - started,
        startedAt,
        status: 'ok',
      });

      return output;
    } catch (error) {
      await this.record({
        ...input,
        durationMs: performance.now() - started,
        errorMessage: error instanceof Error ? error.message : '未知错误',
        startedAt,
        status: 'error',
      });
      throw error;
    }
  }

  createSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  createTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  private async cleanupIfDue(): Promise<void> {
    const now = Date.now();

    if (now - this.lastCleanupAt < CLEANUP_INTERVAL_MS) {
      return;
    }

    this.lastCleanupAt = now;
    const cutoff = new Date(now - this.retentionDays * 24 * 60 * 60 * 1_000);

    await this.repository.deleteBefore(cutoff);
  }

  private normalizeError(message: string | undefined): string | undefined {
    return message?.slice(0, MAX_ERROR_MESSAGE_LENGTH);
  }

  private resolveAlert(
    input: RecordObservabilityEvent,
    costUsdMicros: number,
  ): { message: string; severity: ObservabilityAlertSeverity } | undefined {
    if (
      input.status === 'error' &&
      (input.category !== 'http' || (input.statusCode ?? 500) >= 500)
    ) {
      return {
        message: `${input.operation} 执行失败`,
        severity: 'critical',
      };
    }

    if (input.category === 'model' && input.durationMs >= this.slowModelMs) {
      return {
        message: `${input.operation} 模型调用耗时过长`,
        severity: 'warning',
      };
    }

    if (input.category === 'http' && input.durationMs >= this.slowRequestMs) {
      return {
        message: `${input.operation} 请求耗时过长`,
        severity: 'warning',
      };
    }

    if (this.highCostUsdMicros > 0 && costUsdMicros >= this.highCostUsdMicros) {
      return {
        message: `${input.operation} 单次调用成本超过阈值`,
        severity: 'warning',
      };
    }

    return undefined;
  }

  private writeStructuredLog(event: ObservabilityEvent): void {
    const payload = JSON.stringify({
      agentId: event.agentId,
      category: event.category,
      costUsdMicros: event.costUsdMicros,
      durationMs: Math.round(event.durationMs * 100) / 100,
      inputTokens: event.inputTokens,
      model: event.model,
      operation: event.operation,
      outputTokens: event.outputTokens,
      providerId: event.providerId,
      spanId: event.spanId,
      status: event.status,
      statusCode: event.statusCode,
      timestamp: new Date().toISOString(),
      traceId: event.traceId,
    });

    if (event.status === 'error') {
      process.stderr.write(`${payload}\n`);
      return;
    }

    process.stdout.write(`${payload}\n`);
  }
}
