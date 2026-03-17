/**
 * Shared app-wide types — reduces `any` usage across screens and services.
 */

// ─── Event helpers ───────────────────────────────────────
// ParsedEvent is the canonical CalendarEvent with a pre-parsed _dt Date field.
// Canonical definition lives in ./calendar — re-exported from types/index.ts
export type { ParsedEvent } from './calendar';

// ─── Moment types ────────────────────────────────────────
export type MomentType = 'manual' | 'milestone' | 'auto';

export interface Moment {
  id: string;
  connectionId: string;
  title: string;
  note?: string;
  photoUri?: string | null;
  type: MomentType;
  date: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Pulse types ─────────────────────────────────────────
export interface PulseOption {
  id: string;
  emoji: string;
  label: string;
  weight: number;
  color?: string;
}

export interface PulseEntry {
  id: string;
  connectionId: string;
  pulseId: string;
  date: string;
  note?: string;
  createdAt: string;
}

export interface PulseOverview {
  connectionId: string;
  firstName: string;
  prompt: string;
  answered: boolean;
  pulse: PulseOption | null;
  color: string | null;
}

// ─── XP types ────────────────────────────────────────────
export interface XPState {
  total: number;
  level: number;
  levelName: string;
  progress: number;
  nextLevelAt: number;
}

// ─── Settings types ──────────────────────────────────────
export interface AppSettings {
  calendarView?: 'month' | 'week';
  firstDayOfWeek?: 'Mon' | 'Sun';
  timeFormat?: '12h' | '24h';
  theme?: 'system' | 'light' | 'dark';
  notificationsEnabled?: boolean;
  dailyDigest?: boolean;
  digestHour?: number;
  digestMinute?: number;
  shareCalendar?: boolean;
  haptics?: boolean;
  [key: string]: unknown;
}

// ─── Wallpaper ───────────────────────────────────────────
export interface WallpaperConfig {
  id: string;
  colors: readonly [string, string];
  name?: string;
}

// ─── Ritual types ────────────────────────────────────────
export interface RitualEntry {
  date: string;
  stressLevel: number;
  energyLevel: number;
  topNeeds: string[];
  appreciation: string;
  connectionId: string;
  createdAt: string;
}

// ─── Accountability types ────────────────────────────────
export interface AccountabilityItem {
  id: string;
  label: string;
  status: 'done' | 'missed' | 'pending';
  score?: number;
}

export interface AccountabilityOverview {
  items: AccountabilityItem[];
  overallScore: number;
  streak: number;
}

// ─── Notification types ──────────────────────────────────
export interface NotificationPreferences {
  enabled: boolean;
  dailyDigest: boolean;
  digestHour: number;
  digestMinute: number;
  eventReminders: boolean;
  taskReminders: boolean;
}

// ─── Navigation param helpers ────────────────────────────
export type EventPrefill = {
  title?: string;
  time?: string;
  icon?: string;
  date?: string;
};

// ─── Accountability types ─────────────────────────────────
export interface AccountabilityStreak {
  current: number;
  longest: number;
  lastDate: string | null;
}

export interface AccountabilityNudge {
  text: string;
  emoji: string;
  type?: 'warning' | 'gentle' | 'celebration' | 'positive' | 'info' | 'neutral';
}

export interface AccountabilitySnapshot {
  connectionId: string;
  balance: number;
  myCompletions: number;
  theirCompletions: number;
  myTotal: number;
  theirTotal: number;
  totalTasks: number;
  missedByMe: string[];
  missedByThem: string[];
  totalMissed: number;
  streak: AccountabilityStreak;
  sharedEventsCount: number;
  nudge: AccountabilityNudge;
}
