/** 兼容 TypeORM 不同查询路径返回的 rows 或 [rows, metadata] 结构。 */
export function unwrapPostgresRows<T>(result: unknown): T[] {
  if (!Array.isArray(result)) {
    return [];
  }

  const rows =
    result.length === 2 && Array.isArray(result[0]) ? result[0] : result;

  return rows as T[];
}
