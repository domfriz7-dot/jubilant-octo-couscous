/**
 * Canonical settings schema for U&Me.
 *
 * Rules:
 * - Every setting key must be declared here.
 * - Defaults live here.
 * - Runtime validation/normalization lives here.
 * - Other modules may READ/WRITE settings only through SettingsService,
 *   but they must not invent new keys (SettingsKey is derived from SETTINGS_KEYS).
 */

export type ThemeMode = 'Auto' | 'Light' | 'Dark';
export type CalendarView = 'week' | 'month';
export type FirstDayOfWeek = 'Sun' | 'Mon';
export type TimeFormat = '12h' | '24h';
export type AppLanguage = 'English' | 'Spanish' | 'Japanese' | 'Indonesian';

export const SETTINGS_KEYS = [
  // Notifications
  'eventReminders',
  'taskReminders',
  'dailyDigest',
  'digestHour',
  'digestMinute',
  'nudges',
  'eventChanges',
  'weeklyReport',
  'weeklyReportDay',
  'weeklyReportHour',

  // Appearance
  'theme',
  'language',

  // Calendar defaults
  'defaultEventDuration',
  'defaultEventColor',
  'calendarView',
  'firstDayOfWeek',
  'timeFormat',
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export type AppSettings = {
  // Notifications
  eventReminders: boolean;
  taskReminders: boolean;
  dailyDigest: boolean;
  digestHour: number; // 0-23
  digestMinute: number; // 0-59
  nudges: boolean;
  eventChanges: boolean;
  weeklyReport: boolean;
  weeklyReportDay: number; // 0-6 (Sunday=0)
  weeklyReportHour: number; // 0-23

  // Appearance
  theme: ThemeMode;
  language: AppLanguage;

  // Calendar defaults
  defaultEventDuration: number; // minutes
  defaultEventColor: string; // token color or 'auto'
  calendarView: CalendarView;
  firstDayOfWeek: FirstDayOfWeek;
  timeFormat: TimeFormat;
};

export const DEFAULT_SETTINGS: AppSettings = {
  // Notifications
  eventReminders: true,
  taskReminders: true,
  dailyDigest: true,
  digestHour: 8,
  digestMinute: 0,
  nudges: true,
  eventChanges: true,
  weeklyReport: true,
  weeklyReportDay: 0, // Sunday
  weeklyReportHour: 10,

  // Appearance
  theme: 'Auto',
  language: 'English',

  // Calendar defaults
  defaultEventDuration: 60,
  defaultEventColor: 'auto',
  calendarView: 'month',
  firstDayOfWeek: 'Mon',
  timeFormat: '12h',
};

export const NOTIFICATION_KEYS = [
  'eventReminders',
  'taskReminders',
  'dailyDigest',
  'digestHour',
  'digestMinute',
  'nudges',
  'eventChanges',
  'weeklyReport',
  'weeklyReportDay',
  'weeklyReportHour',
] as const;

export type NotificationSettingsKey = (typeof NOTIFICATION_KEYS)[number];
export type NotificationPrefs = Pick<AppSettings, NotificationSettingsKey>;

export function pickNotificationPrefs(settings: AppSettings): NotificationPrefs {
  const prefs: Record<string, unknown> = {};
  for (const k of NOTIFICATION_KEYS) prefs[k] = settings[k];
  return prefs as NotificationPrefs;
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (typeof v === 'string' && (allowed as readonly string[]).includes(v)) ? (v as T) : fallback;
}

/**
 * Runtime validation + normalization.
 * - Drops unknown keys
 * - Coerces primitives where safe
 * - Clamps numeric ranges
 * - Normalizes enums
 */
export function validateSettings(raw: unknown): AppSettings {
  const input = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  // Start from defaults
  const s: AppSettings = { ...DEFAULT_SETTINGS };

  // Only apply known keys (prevents invented keys from persisting)
  for (const key of SETTINGS_KEYS) {
    if (!(key in input)) continue;
    (s as Record<string, unknown>)[key] = input[key];
  }

  // Coerce + clamp
  s.eventReminders = asBool(s.eventReminders, DEFAULT_SETTINGS.eventReminders);
  s.taskReminders = asBool(s.taskReminders, DEFAULT_SETTINGS.taskReminders);
  s.dailyDigest = asBool(s.dailyDigest, DEFAULT_SETTINGS.dailyDigest);
  s.nudges = asBool(s.nudges, DEFAULT_SETTINGS.nudges);
  s.eventChanges = asBool(s.eventChanges, DEFAULT_SETTINGS.eventChanges);
  s.weeklyReport = asBool(s.weeklyReport, DEFAULT_SETTINGS.weeklyReport);

  s.digestHour = clamp(asInt(s.digestHour, DEFAULT_SETTINGS.digestHour), 0, 23);
  s.digestMinute = clamp(asInt(s.digestMinute, DEFAULT_SETTINGS.digestMinute), 0, 59);
  s.weeklyReportDay = clamp(asInt(s.weeklyReportDay, DEFAULT_SETTINGS.weeklyReportDay), 0, 6);
  s.weeklyReportHour = clamp(asInt(s.weeklyReportHour, DEFAULT_SETTINGS.weeklyReportHour), 0, 23);

  s.theme = oneOf(s.theme, ['Auto', 'Light', 'Dark'] as const, DEFAULT_SETTINGS.theme);
  s.language = oneOf(s.language, ['English', 'Spanish', 'Japanese', 'Indonesian'] as const, DEFAULT_SETTINGS.language);
  s.calendarView = oneOf(s.calendarView, ['week', 'month'] as const, DEFAULT_SETTINGS.calendarView);
  s.firstDayOfWeek = oneOf(s.firstDayOfWeek, ['Sun', 'Mon'] as const, DEFAULT_SETTINGS.firstDayOfWeek);
  s.timeFormat = oneOf(s.timeFormat, ['12h', '24h'] as const, DEFAULT_SETTINGS.timeFormat);

  const dur = clamp(asInt(s.defaultEventDuration, DEFAULT_SETTINGS.defaultEventDuration), 5, 600);
  // Keep duration on sensible increments
  const allowedDurations = [15, 30, 45, 60, 90, 120];
  s.defaultEventDuration = allowedDurations.includes(dur) ? dur : DEFAULT_SETTINGS.defaultEventDuration;

  s.defaultEventColor = typeof s.defaultEventColor === 'string' ? s.defaultEventColor : DEFAULT_SETTINGS.defaultEventColor;

  return s;
}
