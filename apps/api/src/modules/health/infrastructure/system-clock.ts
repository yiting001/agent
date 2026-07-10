import type { Clock } from '../application/ports/clock.port';

/** Production clock backed by the host system. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
