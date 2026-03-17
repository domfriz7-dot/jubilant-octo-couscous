export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  const e = new Error(typeof err === 'string' ? err : 'Unknown error');
  (e as unknown as { cause?: unknown }).cause = err;
  return e;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
