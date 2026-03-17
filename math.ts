// ─── Event/Task Parsing ───────────────────────────────────

export function parseEventDateTime(event: Record<string, unknown>): Date | null {
  // event.date: YYYY-MM-DD, event.time: HH:mm
  try {
    const [y, m, d] = String(event?.date || '').split('-').map(Number);
    const [hh, mm] = String(event?.time || '00:00').split(':').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  } catch {
    return null;
  }
}

export function parseTaskDueDateTime(task: Record<string, unknown>): Date | null {
  try {
    if (!task?.dueDate) return null;
    const [y, m, d] = String(task.dueDate).split('-').map(Number);
    const [hh, mm] = String(task?.dueTime || task?.reminderTime || '23:59').split(':').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  } catch {
    return null;
  }
}


/** Parse a YYYY-MM-DD date key as a local date at midnight (avoids UTC offset bugs). */
export function parseDateKey(dateKey: string): Date | null {
  try {
    if (!dateKey) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
    const [y, mo, d] = dateKey.split('-').map(Number);
    if (!y || !mo || !d) return null;
    return new Date(y, mo - 1, d, 0, 0, 0, 0);
  } catch {
    return null;
  }
}


export type DateKey = string;

export function isDateKey(value: unknown): value is DateKey {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Convert a Date (local time) to a YYYY-MM-DD date key. */
export function toDateKey(date: Date = new Date()): DateKey {
  return todayKey(date);
}

/** Lexicographic compare for YYYY-MM-DD (safe because fixed-width). */
export function compareDateKeys(a: DateKey, b: DateKey): number {
  return String(a).localeCompare(String(b));
}

// ─── Formatting ────────────────────────────────────────────

export function formatTime(date: Date | null | undefined, timeFormat: string = '12h'): string {
  if (!(date instanceof Date)) return '';
  const h = date.getHours();
  const m = date.getMinutes();
  const mm = String(m).padStart(2, '0');

  // Support 24h display when requested.
  if (String(timeFormat).toLowerCase().includes('24')) {
    const hh = String(h).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${mm} ${ampm}`;
}


/** Get weekday index (0=Sun..6=Sat) for a YYYY-MM-DD local date key. */
export function weekdayIndex(dateKey: string): number | null {
  const d = parseDateKey(dateKey);
  return d ? d.getDay() : null;
}

export function formatDayLabel(date: Date | null | undefined): string {
  if (!(date instanceof Date)) return '';
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

// ─── Date Manipulation ─────────────────────────────────────

/** Get current date as YYYY-MM-DD string (LOCAL time, not UTC) */
export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
/** Get start of day (midnight) for a given date */
export function startOfDay(date: Date | string | number): Date {
  const d =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? (parseDateKey(date) ?? new Date(`${date}T00:00:00`))
      : new Date(date instanceof Date ? date.getTime() : date);
  d.setHours(0, 0, 0, 0);
  return d;
}


/** Get start of today (midnight) */
export function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Add days to a date */
export function addDays(date: Date | string | number, days: number): Date {
  const d =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? (parseDateKey(date) ?? new Date(`${date}T00:00:00`))
      : new Date(date instanceof Date ? date.getTime() : date);
  d.setDate(d.getDate() + days);
  return d;
}


/** Calculate days between two date strings (YYYY-MM-DD) */
export function daysBetween(date1Str: string, date2Str: string): number {
  try {
    const d1 = parseDateKey(date1Str) ?? new Date(`${date1Str}T00:00:00`);
    const d2 = parseDateKey(date2Str) ?? new Date(`${date2Str}T00:00:00`);
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    if (!isFinite(diffMs)) return 0;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/** Calculate hours between two ISO datetime strings */
export function hoursBetween(aIso: string, bIso: string): number | null {
  try {
    const a = new Date(aIso);
    const b = new Date(bIso);
    const ms = b.getTime() - a.getTime();
    if (!isFinite(ms)) return null;
    return ms / (1000 * 60 * 60);
  } catch {
    return null;
  }
}

/** Calculate hours until a future datetime from a reference datetime */
export function hoursUntil(futureIso: string, fromIso: string): number | null {
  try {
    const future = new Date(futureIso);
    const from = new Date(fromIso);
    const ms = future.getTime() - from.getTime();
    if (!isFinite(ms)) return null;
    return ms / (1000 * 60 * 60);
  } catch {
    return null;
  }
}

/** Check if a date (YYYY-MM-DD) is within the last N days */
export function inLastNDays(isoDate: string, n: number): boolean {
  const d = new Date(`${isoDate}T00:00:00`);
  const cutoff = startOfDay(addDays(new Date(), -n));
  return d >= cutoff;
}

/**
 * Get the current week window (last 7 days)
 * Returns { start, end } where end is exclusive (tomorrow at midnight)
 */
export function weekWindow(): { start: Date; end: Date } {
  const end = startOfDay(addDays(new Date(), 1)); // exclusive tomorrow
  const start = startOfDay(addDays(new Date(), -6));
  return { start, end };
}
