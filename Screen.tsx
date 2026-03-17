import React from 'react';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';

/**
 * Consistent icon component using Feather icons.
 * Usage: <Icon name="calendar" size={20} color="#FFF" />
 * 
 * Common icons used throughout:
 *   Navigation: arrow-left, x, chevron-right, chevron-down
 *   Actions: plus, check, edit-2, trash-2, share, send, copy
 *   Content: calendar, clock, bell, bell-off, user, users, link
 *   Status: star, award, zap, trending-up, target
 *   UI: search, filter, more-horizontal, settings, sun, moon, monitor
 */
export default function Icon({ name, size = 20, color, style }: { name: string; size?: number; color?: string; style?: object }) {
  const { theme } = useAppTheme();
  return <Feather name={name} size={size} color={color || theme.text.primary} style={style} />;
}

// Re-export for convenience
export { Feather };
