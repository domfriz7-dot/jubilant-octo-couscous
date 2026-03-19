import { logError } from '../services/logger';

type Ctx = {
  feature?: string;
  screen?: string;
  extra?: Record<string, unknown>;
};

/**
 * Runtime safety helper:
 * - prevents hard crashes from async service calls
 * - logs consistently
 * - returns a typed fallback so UI can continue
 */
export async function safeServiceCall<T>(
  fn: () => Promise<T>,
  fallback: T,
  ctx: Ctx = {},
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const label = ctx.feature || ctx.screen || 'safeServiceCall';
    logError(label, e, ctx.extra);
    return fallback;
  }
}

export function safeSync<T>(fn: () => T, fallback: T, ctx: Ctx = {}): T {
  try {
    return fn();
  } catch (e) {
    const label = ctx.feature || ctx.screen || 'safeSync';
    logError(label, e, ctx.extra);
    return fallback;
  }
}
