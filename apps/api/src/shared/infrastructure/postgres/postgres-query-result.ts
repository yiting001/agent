export function unwrapPostgresRows<T>(result: unknown): T[] {
  if (!Array.isArray(result)) {
    return [];
  }

  const rows =
    result.length === 2 && Array.isArray(result[0]) ? result[0] : result;

  return rows as T[];
}
