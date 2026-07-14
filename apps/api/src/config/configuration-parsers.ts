/** 仅把字面值 "true" 解析为 true。 */
export function parseBoolean(value: string | undefined): boolean {
  return value === 'true';
}

/** 解析大于零的安全整数，否则在启动阶段失败。 */
export function parsePositiveInteger(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

/** 解析大于等于零的安全整数，否则在启动阶段失败。 */
export function parseNonNegativeInteger(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return parsed;
}

/** 解析闭区间内的安全整数。 */
export function parseIntegerInRange(
  name: string,
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}.`,
    );
  }

  return parsed;
}

/** 解析有限的非负数。 */
export function parseNonNegativeNumber(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }

  return parsed;
}

/** 校验可安全拼接到 Redis 键中的命名空间前缀。 */
export function parseKeyPrefix(
  name: string,
  value: string | undefined,
  fallback: string,
): string {
  const prefix = value ?? fallback;

  if (!/^[a-zA-Z0-9_-]+$/.test(prefix)) {
    throw new Error(
      `${name} may only contain letters, numbers, underscores, and hyphens.`,
    );
  }

  return prefix;
}

/** 规范化 URL，并按需限制允许的协议。 */
export function parseUrl(
  name: string,
  value: string | undefined,
  fallback?: string,
  allowedProtocols?: string[],
): string | undefined {
  const normalized = optionalValue(value) ?? fallback;

  if (!normalized) {
    return undefined;
  }

  try {
    const url = new URL(normalized);

    if (allowedProtocols && !allowedProtocols.includes(url.protocol)) {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

/** 去除首尾空白，并把空字符串归一化为 undefined。 */
export function optionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}
