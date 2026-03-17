export type AppErrorCode =
  | 'UNKNOWN'
  | 'STORAGE'
  | 'PARSE'
  | 'VALIDATION'
  | 'NETWORK'
  | 'PERMISSION'
  | 'NOT_FOUND'
  | 'UNSUPPORTED';

export type AppError = {
  code: AppErrorCode;
  message: string;
  /** Original thrown value (kept as unknown). Never rely on its shape. */
  cause?: unknown;
  /** Optional extra debug context */
  details?: unknown;
};

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const err = (
  message: string,
  code: AppErrorCode = 'UNKNOWN',
  opts?: { cause?: unknown; details?: unknown }
): Result<never> => ({
  ok: false,
  error: { code, message, cause: opts?.cause, details: opts?.details },
});

export function unwrapOrThrow<T>(r: Result<T>): T {
  if (r.ok) return r.value;
  const e = (r as { ok: false; error: AppError }).error;
  const msg = `[${e.code}] ${e.message}`;
  // Throw a real Error for React Native redbox + Sentry grouping.
  const ex = new Error(msg);
  (ex as unknown as { cause?: unknown }).cause = e.cause;
  throw ex;
}
