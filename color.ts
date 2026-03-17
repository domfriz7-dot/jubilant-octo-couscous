/**
 * Best-effort error reporting that will NEVER crash the app.
 * Uses the internal logger if available; falls back to console.
 */
export function reportError(
  name: string,
  error: unknown,
  extra: Record<string, unknown> = {}
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const logger = require('../services/logger');
    const logError = logger?.logError as ((n: string, e: unknown, x?: Record<string, unknown>) => void) | undefined;
    if (typeof logError === 'function') {
      logError(name, error, extra);
      return;
    }
  } catch {
    // ignore
    // Intentionally ignored — non-critical failure
  }

  try {
    // eslint-disable-next-line no-console
    console.warn('[error]', name, error, extra);
  } catch {
    // ignore
    // Intentionally ignored — non-critical failure
  }
}
