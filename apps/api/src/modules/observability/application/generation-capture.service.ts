import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';

import type { ApplicationConfig } from '../../../config/application.config';
import type {
  ObservabilityCaptureMode,
  ObservabilityGenerationConfiguration,
  ObservabilityGenerationMessage,
  ObservabilityGenerationStatus,
} from '../domain/observability-generation';
import {
  sanitizeGenerationMessages,
  sanitizeGenerationText,
} from '../domain/observability-generation';
import { ObservabilityGenerationRepository } from './observability-generation.repository';
import { ObservabilityService } from './observability.service';
import { ObservabilityTraceContext } from './observability-trace.context';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1_000;
const ACTOR_HASH_CONTEXT = 'observability-feedback-actor:v1';

export interface StartGenerationCaptureInput {
  actorKey?: string;
  agentId: string;
  configuration: ObservabilityGenerationConfiguration;
  conversationId?: string;
  inputMessages: ObservabilityGenerationMessage[];
  providerId: string;
  providerName: string;
  requestedModel: string;
  source: string;
}

export interface GenerationCaptureIdentity {
  generationId: string;
  traceId: string;
}

export interface GenerationModelResponse {
  finishReasons?: string[];
  responseModel?: string;
  upstreamResponseId?: string;
}

/** 观测写入失败不得中断真实聊天请求。 */
@Injectable()
export class GenerationCaptureService {
  private readonly captureMode: ObservabilityCaptureMode;
  private readonly contentMaxCharacters: number;
  private readonly contentRetentionDays: number;
  private lastCleanupAt = 0;
  private readonly logger = new Logger(GenerationCaptureService.name);

  constructor(
    private readonly repository: ObservabilityGenerationRepository,
    private readonly context: ObservabilityTraceContext,
    private readonly observability: ObservabilityService,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.captureMode = config.observabilityContentCaptureMode;
    this.contentMaxCharacters = config.observabilityContentMaxCharacters;
    this.contentRetentionDays = config.observabilityContentRetentionDays;
  }

  async start(
    input: StartGenerationCaptureInput,
  ): Promise<GenerationCaptureIdentity> {
    const generationId = randomUUID();
    const traceId =
      this.context.current()?.traceId ?? this.observability.createTraceId();
    const startedAt = new Date();
    const sanitized = sanitizeGenerationMessages(
      input.inputMessages,
      this.contentMaxCharacters,
    );

    await this.safely('start', generationId, () =>
      this.repository.start(
        {
          actorKeyHash: input.actorKey
            ? this.hashActorKey(input.actorKey)
            : undefined,
          agentId: input.agentId,
          configuration: input.configuration,
          conversationId: input.conversationId,
          finishReasons: [],
          id: generationId,
          providerId: input.providerId,
          providerName: input.providerName,
          requestedModel: input.requestedModel,
          source: input.source,
          startedAt,
          status: 'running',
          traceId,
        },
        this.captureMode === 'redacted'
          ? {
              captureMode: this.captureMode,
              expiresAt: new Date(
                startedAt.getTime() +
                  this.contentRetentionDays * 24 * 60 * 60 * 1_000,
              ),
              generationId,
              inputMessages: sanitized.messages,
              outputText: '',
              redactionCount: sanitized.redactionCount,
              truncated: sanitized.truncated,
            }
          : undefined,
      ),
    );
    await this.cleanupIfDue();

    return { generationId, traceId };
  }

  complete(generationId: string, outputText: string): Promise<void> {
    return this.finish(generationId, 'completed', outputText);
  }

  cancel(generationId: string, outputText: string): Promise<void> {
    return this.finish(generationId, 'cancelled', outputText);
  }

  fail(generationId: string, outputText: string): Promise<void> {
    return this.finish(generationId, 'error', outputText);
  }

  captureModelResponse(
    generationId: string | undefined,
    response: GenerationModelResponse,
  ): Promise<void> {
    if (!generationId) {
      return Promise.resolve();
    }

    return this.safely('model-response', generationId, () =>
      this.repository.updateModel({
        finishReasons: response.finishReasons ?? [],
        generationId,
        responseModel: response.responseModel,
        upstreamResponseId: response.upstreamResponseId,
      }),
    );
  }

  hashActorKey(actorKey: string): string {
    return createHash('sha256')
      .update(`${ACTOR_HASH_CONTEXT}:${actorKey}`)
      .digest('hex');
  }

  private async cleanupIfDue(): Promise<void> {
    const now = Date.now();

    if (now - this.lastCleanupAt < CLEANUP_INTERVAL_MS) {
      return;
    }

    this.lastCleanupAt = now;
    await this.safely('cleanup', 'retention', () =>
      this.repository.deleteExpiredContents(new Date(now)),
    );
  }

  private finish(
    generationId: string,
    status: Exclude<ObservabilityGenerationStatus, 'running'>,
    outputText: string,
  ): Promise<void> {
    const sanitized = sanitizeGenerationText(
      outputText,
      this.contentMaxCharacters,
    );

    return this.safely(status, generationId, () =>
      this.repository.complete({
        completedAt: new Date(),
        generationId,
        output:
          this.captureMode === 'redacted'
            ? {
                redactionCount: sanitized.redactionCount,
                text: sanitized.value,
                truncated: sanitized.truncated,
              }
            : undefined,
        status,
      }),
    );
  }

  private async safely(
    operation: string,
    generationId: string,
    action: () => Promise<void>,
  ): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          generationId,
          operation,
        }),
      );
    }
  }
}
