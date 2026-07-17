const TRACE_ID_PATTERN = /^[\da-f]{32}$/i;
const UUID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/** Only known opaque identifiers may cross into the low-sensitive audit table. */
export function sanitizeManagementAuditResourceId(
  parameterName: string | undefined,
  value: unknown,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  if (parameterName === 'feedbackId' && UUID_PATTERN.test(value)) {
    return value;
  }

  if (parameterName === 'traceId' && TRACE_ID_PATTERN.test(value)) {
    return value;
  }

  return undefined;
}
