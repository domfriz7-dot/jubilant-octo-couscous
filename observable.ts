/**
 * Clamp a number between min and max
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Clamp a number between 0 and 1
 */
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Convert 0-1 value to percentage (0-100)
 */
export function pct(x: number): number {
  return Math.round(clamp01(x) * 100);
}

/**
 * Safe division (returns 0 if denominator is 0)
 */
export function safeDiv(a: number, b: number): number {
  return b ? a / b : 0;
}
