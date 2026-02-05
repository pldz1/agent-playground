export function sanitizeLargeFields(data: unknown) {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === 'string' && value.startsWith('data:image') && value.length > 200) {
        return `[Base64 Image omitted, length=${value.length}]`;
      }

      if (typeof value === 'string' && value.length > 5000) {
        return `[Long string omitted, length=${value.length}]`;
      }

      return value;
    }),
  );
}

export function stringifySafe(data: unknown | null | undefined) {
  if (data === null || data === undefined) {
    return undefined;
  }
  try {
    return JSON.stringify(sanitizeLargeFields(data), null, 2);
  } catch {
    return undefined;
  }
}
