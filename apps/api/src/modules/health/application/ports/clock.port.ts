/** Time source used by application logic. */
export interface Clock {
  now(): Date;
}
