import type {
  ObservabilityDashboard,
  ObservabilityTraceDetail,
  ObservabilityTracePage,
} from '../domain/observability-dashboard';

export interface ObservabilityTracePageQuery {
  cursor?: {
    startedAt: string;
    traceId: string;
  };
  hours: number;
  page: number;
  pageSize: number;
}

/** 获取观测仪表盘聚合数据的应用层端口。 */
export abstract class ObservabilityGateway {
  abstract getDashboard(hours: number): Promise<ObservabilityDashboard>;
  abstract getTrace(traceId: string): Promise<ObservabilityTraceDetail>;
  abstract listTraces(
    query: ObservabilityTracePageQuery,
  ): Promise<ObservabilityTracePage>;
}
