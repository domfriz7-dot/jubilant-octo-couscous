// Central type exports for the app.
// Start broad + permissive; tighten (strict mode) after migrating more files.

export type ThemeType =
  | 'system'
  | 'default'
  | 'light'
  | 'dark'
  | 'blue'
  | 'pink'
  | 'green'
  | 'purple';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  theme?: ThemeType;
  level?: number;
  xp?: number;
}

export interface Reminder {
  id: string;
  time: string; // HH:MM
  sent: boolean;
}

export type Listener<T> = (data: T) => void;
export type Unsubscribe = () => void;

// Legacy place for route params (some older files may import from here).
// Canonical definition lives in src/navigation/types.ts — re-exported here for compatibility.
export type { RootStackParamList } from '../navigation/types';

export * from './calendar';
export * from './tasks';

export * from './aiDatePlanner';
export * from './snapshot';
export * from './connections';

// Settings types live in src/config/settingsSchema (canonical schema).
export type { AppSettings, SettingsKey } from '../config/settingsSchema';

export * from './shared';
