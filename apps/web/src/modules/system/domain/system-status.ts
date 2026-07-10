/** Health state displayed by the system module. */
export interface SystemStatus {
  readonly service: string;
  readonly status: 'ok';
  readonly timestamp: string;
}
