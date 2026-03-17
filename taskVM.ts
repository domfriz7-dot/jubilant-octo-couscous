import { tokens } from '../config/tokens';

export type ColorKey =
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
  | 'accent'
  | 'muted'
  | 'streak'
  | 'high'
  | 'med'
  | 'low'
  | string;

// Theme is defined in JS UI layer; keep as `any` at the boundary.
export function resolveColor(key: ColorKey, theme: { semantic: Record<string, Record<string, string>>; accent: Record<string, string>; text: Record<string, string> }): string {
  const map: Record<string, string> = {
    error: theme.error,
    warning: theme.warning,
    success: theme.success,
    info: theme.accent?.primary,
    accent: theme.accent?.primary,
    muted: theme.text?.tertiary,
    streak: tokens.streak,
    high: tokens.priority.high,
    med: tokens.priority.med,
    low: tokens.priority.low,
  };
  return map[key] || theme.text?.secondary;
}
