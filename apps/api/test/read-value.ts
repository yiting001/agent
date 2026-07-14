export function readStringProperty(value: unknown, property: string): string {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Expected ${property} to be a string.`);
  }

  const result = (value as Record<string, unknown>)[property];

  if (typeof result !== 'string') {
    throw new Error(`Expected ${property} to be a string.`);
  }

  return result;
}
