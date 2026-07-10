/** Public health information returned by the application boundary. */
export interface HealthStatus {
  readonly service: string;
  readonly status: 'ok';
  readonly timestamp: string;
}
