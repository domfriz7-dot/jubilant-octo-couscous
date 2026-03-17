/**
 * Shared prop interfaces for memo'd components.
 *
 * Centralizing these prevents the class of bugs where a component
 * receives `onPress` but the parent passes `onSelect` — TypeScript
 * catches the mismatch at compile time.
 */

import type { ViewStyle, StyleProp } from 'react-native';

// ── Theme shape (subset used by components) ──────────────
export interface ThemeColors {
  accent: { primary: string; light: string; muted: string };
  bg: { card: string; subtle: string; elevated: string; muted: string; default: string; surface: string };
  text: { primary: string; secondary: string; tertiary: string; muted: string; inverse: string };
  border: string;
  divider: string;
  error: string;
  shadow: { sm: ViewStyle };
}

// ── Reusable row/card props ──────────────────────────────
export interface MemoRowProps {
  theme: ThemeColors;
}

export interface PressableRowProps extends MemoRowProps {
  onPress: () => void;
}

// ── Screen-specific component props ──────────────────────

export interface AchievementBadgeProps extends MemoRowProps {
  a: { emoji: string; label: string; color?: string };
}

export interface BudgetCardProps extends MemoRowProps {
  amount: number;
  label: string;
  icon: string;
  desc: string;
  active: boolean;
  onPress: () => void;
}

export interface VibeChipProps extends MemoRowProps {
  vibe: string;
  currentVibe: string;
  /** Called with the vibe key when tapped */
  onSelect: (vibe: string) => void;
}

export interface ConnectionRowProps extends MemoRowProps {
  item: { id: string; name: string; color?: string; relationship?: string };
  onPress: (item: unknown) => void;
}

export interface EventRowProps extends MemoRowProps {
  event: { id: string; title: string; time?: string; color?: string };
  onPress: (event: unknown) => void;
}

export interface StatTileProps extends MemoRowProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
}

export interface MomentCardProps extends MemoRowProps {
  moment: { emoji?: string; title: string; body?: string };
  onPress: () => void;
}
