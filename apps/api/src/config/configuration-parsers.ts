export function parseBoolean(value: string | undefined): boolean {
  return value === 'true';
}

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

export function optionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}
