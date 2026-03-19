/**
 * retry — exponential backoff wrapper for flaky async operations.
 *
 * Use for: Firebase reads, network calls, AsyncStorage on first boot.
 * Don't use for: user-facing saves (show error immediately instead).
 */

import { logError } from '../services/logger';

interface RetryOptions {
  /** Max attempts (default: 3) */
  attempts?: number;
  /** Base delay in ms (default: 500, doubles each retry) */
  delayMs?: number;
  /** Context label for logging */
  label?: string;
  /** Whether to log failures (default: true) */
  silent?: boolean;
}

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { attempts = 3, delayMs = 500, label = 'retry', silent = false } = opts;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) {
        const wait = delayMs * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  if (!silent) {
    logError(label, lastError, { attempts }).catch(() => {});
  }
  throw lastError;
}

/**
 * retryOrDefault — like retry but returns a fallback instead of throwing.
 */
export async function retryOrDefault<T>(
  fn: () => Promise<T>,
  fallback: T,
  opts: RetryOptions = {}
): Promise<T> {
  try {
    return await retry(fn, opts);
  } catch {
    return fallback;
  }
}
