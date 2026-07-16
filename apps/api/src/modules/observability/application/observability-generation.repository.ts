import type {
  ObservabilityFeedback,
  ObservabilityGeneration,
  ObservabilityGenerationContent,
  ObservabilityGenerationDetail,
  ObservabilityGenerationStatus,
  ObservabilityQualitySummary,
} from '../domain/observability-generation';

export interface CompleteObservabilityGenerationInput {
  completedAt: Date;
  generationId: string;
  output?: {
    redactionCount: number;
    text: string;
    truncated: boolean;
  };
  status: Exclude<ObservabilityGenerationStatus, 'running'>;
}

export interface UpdateObservabilityGenerationModelInput {
  finishReasons: string[];
  generationId: string;
  responseModel?: string;
  upstreamResponseId?: string;
}

export abstract class ObservabilityGenerationRepository {
  abstract complete(input: CompleteObservabilityGenerationInput): Promise<void>;
  abstract deleteExpiredContents(cutoff: Date): Promise<void>;
  abstract findById(id: string): Promise<ObservabilityGeneration | undefined>;
  abstract findByTraceId(
    traceId: string,
  ): Promise<ObservabilityGenerationDetail[]>;
  abstract getQualitySummary(since: Date): Promise<ObservabilityQualitySummary>;
  abstract start(
    generation: ObservabilityGeneration,
    content?: ObservabilityGenerationContent,
  ): Promise<void>;
  abstract updateModel(
    input: UpdateObservabilityGenerationModelInput,
  ): Promise<void>;
  abstract upsertFeedback(
    feedback: ObservabilityFeedback,
  ): Promise<ObservabilityFeedback>;
}
