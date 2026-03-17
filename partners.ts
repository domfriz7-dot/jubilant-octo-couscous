/**
 * Safely append hex opacity to a color string.
 *
 * Handles:
 * - 6-digit hex: '#B09080' + 0.1 → '#B090801A'
 * - 3-digit hex: '#F00' + 0.5 → '#FF000080'
 * - rgb(): 'rgb(176,144,128)' + 0.1 → 'rgba(176,144,128,0.1)'
 * - rgba(): passes through with adjusted alpha
 * - undefined/null: returns transparent fallback
 *
 * @param color - CSS color string
 * @param opacity - 0–1 opacity value
 * @returns Color string with opacity applied
 */
export function withOpacity(color: string | undefined | null, opacity: number): string {
  if (!color) return `rgba(0,0,0,${opacity})`;

  const c = color.trim();

  // Already rgba — replace alpha
  const rgbaMatch = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},${opacity})`;
  }

  // Hex color
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    // Expand 3-digit hex
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    // Strip existing alpha if 8-digit
    if (hex.length === 8) {
      hex = hex.slice(0, 6);
    }
    const alpha = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${hex}${alpha}`;
  }

  // Fallback: return as-is (named colors, hsl, etc.)
  return c;
}
