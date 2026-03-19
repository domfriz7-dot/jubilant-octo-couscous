/**
 * Insight Engine
 *
 * Pure, deterministic functions that turn raw numbers into
 * emotionally resonant statements. No AI, no backend, no randomness.
 *
 * This is where the app claims credit for what it helps people do.
 * Without this layer, the app says "3 events this week."
 * With this layer, the app says "You\'re making time for each other."
 *
 * Rules:
 *   1. Every function takes plain data, returns a string (or null).
 *   2. null means "nothing worth saying" — silence > noise.
 *   3. Statements are about the RELATIONSHIP, not the feature.
 *   4. Never condescending. Never performative. Just observation.
 *
 * Usage:
 *   import { insights } from '../insights';
 *   const line = insights.weekTogether(sharedEventsCount, firstName);
 *   // → "You\'re seeing Sarah a lot this week."
 */

// ─── Relationship frequency ──────────────────────────────

/**
 * How often two people are together this week.
 * @param {number} sharedEventsThisWeek
 * @param {string} firstName - the other person's first name
 */
export function weekTogether(count: number, firstName: string): string | null {
  if (count === 0) return null;
  if (count === 1) return `You have something planned with ${firstName} this week.`;
  if (count === 2) return `You\'re making time for ${firstName} this week.`;
  if (count >= 3 && count < 5) return `You\'re seeing ${firstName} a lot this week — that\'s good.`;
  return `Big week with ${firstName} — ${count} moments together.`;
}

/**
 * How the total shared history is growing.
 * @param {number} totalSharedEvents - all-time count
 * @param {string} firstName
 */
export function sharedHistory(total: number, firstName: string): string | null {
  if (total === 0) return `Your story with ${firstName} starts here.`;
  if (total === 1) return `Your first moment with ${firstName} is in the books.`;
  if (total < 5) return `You and ${firstName} are building something.`;
  if (total < 15) return `${total} moments shared — you two have a rhythm.`;
  if (total < 30) return `${total} moments — ${firstName} is woven into your life.`;
  return `${total} moments together. This is what showing up looks like.`;
}


// ─── Task completion / accountability ────────────────────

/**
 * When a task is completed.
 * @param {boolean} wasShared - was this task shared with someone?
 * @param {string|null} assignedName - who it was assigned to (null = you)
 * @param {boolean} wasOverdue - was it past due?
 */
export function taskDone(wasShared: boolean, assignedName: string | null, wasOverdue: boolean): string | null {
  if (wasOverdue && wasShared) return "Better late than never — it's handled now.";
  if (wasOverdue) return 'Off your plate. That one was weighing on you.';
  if (wasShared && assignedName) return `${assignedName} got it done.`;
  if (wasShared) return "Nice — that's one less thing to coordinate.";
  return 'Done. One less thing on your mind.';
}

/**
 * When all focus tasks are clear.
 * @param {number} completedToday
 */
export function allClear(completedToday: number): string | null {
  if (completedToday === 0) return null;
  if (completedToday === 1) return 'One down, day is yours.';
  if (completedToday <= 3) return `${completedToday} things handled — you showed up today.`;
  return `${completedToday} things done. That\'s a real day of work.`;
}

/**
 * Overdue tasks — reframe from guilt to action.
 * @param {number} count
 */
export function overdueReframe(count: number): string | null {
  if (count === 0) return null;
  if (count === 1) return 'Just one thing waiting. Quick win.';
  if (count <= 3) return `${count} things piling up — pick the smallest.`;
  return `${count} things overdue. Not great, but starting anywhere helps.`;
}


// ─── Streaks / consistency ───────────────────────────────

/**
 * Mutual streak observation.
 * @param {number} days
 * @param {string} firstName
 */
export function streakInsight(days: number, firstName: string): string | null {
  if (days < 2) return null;
  if (days <= 3) return `${days} days in a row — you and ${firstName} are warming up.`;
  if (days <= 7) return `${days}-day streak. You\'re both building a habit.`;
  if (days <= 14) return `${days} days. This isn\'t luck — it\'s effort.`;
  if (days <= 30) return `${days}-day streak. Most people don\'t make it this far.`;
  return `${days} days straight. This is what commitment looks like.`;
}

/**
 * When a streak breaks.
 * @param {number} previousStreak
 * @param {string} firstName
 */
export function streakBroken(previousStreak: number, firstName: string): string | null {
  if (previousStreak < 3) return null; // not worth mentioning
  if (previousStreak < 7) return 'Streak paused — no big deal, pick it back up.';
  return `${previousStreak}-day streak paused. It\'s not lost — the habit is still there.`;
}


// ─── Balance / fairness ──────────────────────────────────

/**
 * Balance between two people.
 * @param {number} balancePct - 0–100, 50 = even
 * @param {string} firstName - the other person
 * @param {number} myDone
 * @param {number} theirDone
 */
export function balanceInsight(balancePct: number, firstName: string, myDone: number, theirDone: number): string | null {
  if (myDone === 0 && theirDone === 0) return 'Nothing shared this week yet — still early.';
  if (balancePct >= 45 && balancePct <= 55) return "You\'re carrying the same weight. That\'s rare.";
  if (balancePct >= 35 && balancePct <= 65) return 'Close enough — no one is keeping score.';
  if (balancePct < 35) return `${firstName} has done more this week. A small gesture goes a long way.`;
  return `You\'ve been doing more. ${firstName} probably knows.`;
}


// ─── Event moments ───────────────────────────────────────

/**
 * When viewing an event that\'s shared with people.
 * @param {number} sharedCount
 * @param {boolean} isYours
 */
export function eventSharing(sharedCount: number, isYours: boolean): string | null {
  if (sharedCount === 0 && isYours) return 'Just yours — share it when you\'re ready.';
  if (sharedCount === 0) return null;
  if (sharedCount === 1 && isYours) return 'One person in the loop — nice.';
  if (sharedCount === 1) return "Someone thought of you when they planned this.";
  if (isYours) return `${sharedCount} people involved — you brought them together.`;
  return `${sharedCount} people are part of this.`;
}

/**
 * After creating an event.
 * @param {boolean} hasShared
 * @param {number} sharedCount
 */
export function eventCreated(hasShared: boolean, sharedCount: number): string | null {
  if (!hasShared) return "It\'s on the calendar. That alone is a step.";
  if (sharedCount === 1) return "Shared — they can see it now. One less thing to coordinate.";
  return `${sharedCount} people can see this. Planning together > planning alone.`;
}

/**
 * After rescheduling an event.
 */
export function eventRescheduled(): string {
  return 'Moved. Plans change — what matters is keeping them.';
}

/**
 * After deleting an event.
 */
export function eventDeleted(): string {
  return 'Removed. Sometimes clearing the calendar is the right call.';
}


// ─── Connection profile ──────────────────────────────────

/**
 * Bond strength narrative for a connection's profile.
 * @param {number} totalShared - all-time shared events
 * @param {number} streakDays
 * @param {number} balancePct
 * @param {string} firstName
 */
export function bondNarrative(totalShared: number, streakDays: number, balancePct: number, firstName: string): string | null {
  const parts: string[] = [];

  if (totalShared >= 20 && streakDays >= 7 && balancePct >= 40 && balancePct <= 60) {
    return `You and ${firstName} are in a strong rhythm. ${totalShared} moments shared, ${streakDays}-day streak, and you\'re both showing up equally.`;
  }

  if (totalShared === 0) return `Your story with ${firstName} is just beginning.`;

  if (totalShared < 5) parts.push(`Still early — ${totalShared} moments so far`);
  else if (totalShared < 15) parts.push(`${totalShared} moments — a real foundation`);
  else parts.push(`${totalShared} moments — a deep history`);

  if (streakDays >= 3) parts.push(`${streakDays}-day streak`);

  if (parts.length === 0) return null;
  return parts.join('. ') + '.';
}


/**
 * Calculate bond strength (0–100) with a transparent breakdown.
 *
 * V1 goals:
 *  - Deterministic
 *  - Explainable
 *  - Hard to game (roughly)
 *
 * @param {object} input
 * @param {Array<object>} input.sharedEvents - events shared with this person
 * @param {number} input.streakDays - accountability streak (optional)
 * @param {number|null} input.balancePct - accountability balance (optional)
 * @param {string} input.todayKey - YYYY-MM-DD
 * @returns {{
 *   score: number,
 *   label: string,
 *   narrative: (string|null),
 *   components: Array<{key:string,label:string,points:number,detail:string}>
 * }}
 */
export function calculateBondStrength({ sharedEvents, streakDays = 0, ritualStreak = 0, balancePct = null, todayKey }: { sharedEvents: Array<{ date: string; time?: string }>; streakDays?: number; ritualStreak?: number; balancePct?: number | null; todayKey: string }): Record<string, unknown> {
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const today = new Date(todayKey + 'T00:00:00');
  const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

  const events = Array.isArray(sharedEvents) ? sharedEvents : [];

  const combinedStreakDays = Math.max(0, (streakDays || 0)) + Math.max(0, (ritualStreak || 0));

  // Recency: use most recent past event, otherwise next upcoming event.
  const pastEvents = events.filter(e => e.date <= todayKey).sort((a: { date: string; time?: string }, b: { date: string; time?: string }) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  const upcomingEvents = events.filter(e => e.date > todayKey).sort((a: { date: string; time?: string }, b: { date: string; time?: string }) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const anchor = pastEvents[0] || upcomingEvents[0] || null;
  const anchorDate = anchor ? new Date(anchor.date + 'T00:00:00') : null;
  // Clean onboarding: no history should not generate "9999 days" style placeholders.
  const daysSince = anchorDate ? Math.abs(daysBetween(today, anchorDate)) : null;

  let recencyPts = 0;
  if (typeof daysSince === 'number') {
    if (daysSince <= 7) recencyPts = 25;
    else if (daysSince <= 14) recencyPts = 18;
    else if (daysSince <= 30) recencyPts = 10;
    else if (daysSince <= 60) recencyPts = 5;
  }

  // Frequency: shared events in last 30 days (past+today)
  const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
  const last30 = events.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= d30 && d <= today;
  }).length;
  const freqPts = Math.round(clamp01(last30 / 4) * 35); // 4+ in 30 days = max

  // Consistency: number of weeks (out of last 8) with >=1 shared event
  const d56 = new Date(today); d56.setDate(d56.getDate() - 56);
  const last8w = events.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= d56 && d <= today;
  });
  const weekKey = (d: Date) => {
    const dd = new Date(d);
    const day = (dd.getDay() + 6) % 7; // Mon=0
    dd.setDate(dd.getDate() - day);
    return todayKey(dd);
  };
  const weeks = new Set(last8w.map(e => weekKey(new Date(e.date + 'T00:00:00'))));
  const consistencyPts = Math.round(clamp01(weeks.size / 8) * 20);

  // Time investment: total hours in last 90 days
  const d90 = new Date(today); d90.setDate(d90.getDate() - 90);
  const mins90 = events.reduce((sum, e) => {
    const d = new Date(e.date + 'T00:00:00');
    if (d < d90 || d > today) return sum;
    const mins = typeof e.durationMinutes === 'number' ? e.durationMinutes : 60;
    return sum + mins;
  }, 0);
  const hours90 = mins90 / 60;
  const timePts = Math.round(clamp01(hours90 / 10) * 15); // 10h/90d max

  // Follow-through isn\'t tracked yet → don\'t fake it.
  const rawTotal = recencyPts + freqPts + consistencyPts + timePts;
  const score = Math.max(0, Math.min(100, Math.round((rawTotal / 95) * 100))); // rescale to 100

  const label = score >= 80 ? 'Strong' : score >= 55 ? 'Growing' : 'Early';
  const narrative = bondNarrative(events.length, streakDays, typeof balancePct === 'number' ? balancePct : 50, 'them');

  const components = [
    { key: 'frequency', label: 'Frequency', points: Math.round((freqPts / 35) * 37), detail: `${last30} shared plan${last30 === 1 ? '' : 's'} in the last 30 days.` },
    { key: 'recency', label: 'Recency', points: Math.round((recencyPts / 25) * 26), detail: (anchor && typeof daysSince === 'number') ? `Most recent plan is ${daysSince} day${daysSince === 1 ? '' : 's'} away.` : 'No shared plans yet.' },
    { key: 'consistency', label: 'Consistency', points: Math.round((consistencyPts / 20) * 21), detail: `${weeks.size} week${weeks.size === 1 ? '' : 's'} active in the last 8 weeks.` },
    { key: 'time', label: 'Time together', points: Math.round((timePts / 15) * 16), detail: `${hours90.toFixed(hours90 >= 10 ? 0 : 1)} hour${hours90 === 1 ? '' : 's'} in the last 90 days.` },
  ];

  // Normalize component points to sum to score (avoid mismatched totals due to rounding)
  const compSum = components.reduce((s, c) => s + c.points, 0);
  if (compSum !== score && compSum > 0) {
    // adjust the largest component by delta
    const delta = score - compSum;
    const maxIdx = components.reduce((bestIdx, c, idx, arr) => c.points > arr[bestIdx].points ? idx : bestIdx, 0);
    components[maxIdx] = { ...components[maxIdx], points: Math.max(0, components[maxIdx].points + delta) };
  }

  return { score, label, narrative: null, components };
}



// ─── Level up / XP ──────────────────────────────────────

/**
 * XP earned feedback — replaces "+5 XP" with meaning.
 * @param {string} reason - what earned the XP
 * @param {number} amount
 */
export function xpEarned(reason: string, amount: number): { title: string; message: string } | null {
  // Don't overwhelm with XP messages for small amounts
  if (amount <= 3) return null;

  const lower = reason.toLowerCase();
  if (lower.includes('task')) return { title: `+${amount} XP`, message: 'Small actions compound. Nice work.' };
  if (lower.includes('event')) return { title: `+${amount} XP`, message: 'Planning counts. Momentum matters.' };
  if (lower.includes('connection')) return { title: `+${amount} XP`, message: 'Connecting grows your circle.' };
  if (lower.includes('streak')) return { title: `+${amount} XP`, message: 'Consistency is its own reward.' };
  return { title: `+${amount} XP`, message: 'Progress logged.' };
}

/**
 * Level up celebration.
 * @param {number} newLevel
 * @param {string} levelTitle
 */
export function levelUp(newLevel: number, levelTitle: string): string {
  if (newLevel <= 3) return `Level ${newLevel}: ${levelTitle}. You\'re finding your rhythm.`;
  if (newLevel <= 6) return `Level ${newLevel}: ${levelTitle}. You\'re investing in your people.`;
  if (newLevel <= 10) return `Level ${newLevel}: ${levelTitle}. The people around you can feel the difference.`;
  if (newLevel <= 15) return `Level ${newLevel}: ${levelTitle}. You\'re the kind of person who shows up.`;
  return `Level ${newLevel}: ${levelTitle}. Not many people get here.`;
}


// ─── Empty states ────────────────────────────────────────

/**
 * Connection with no shared data yet.
 * @param {string} firstName
 */
export function emptyConnection(firstName: string) {
  return `Nothing shared with ${firstName} yet. The first plan is always the hardest.`;
}

/**
 * Calendar day with nothing.
 * @param {boolean} isWeekend
 */
export function emptyDay(isWeekend: boolean) {
  if (isWeekend) return 'Nothing planned — weekends are for that.';
  return 'Clear day. Protect it or fill it — both are fine.';
}

/**
 * No tasks at all.
 */
export function noTasks() {
  return "Nothing on the list. Add something or enjoy the calm.";
}


// ─── Convenience: named export bundle ────────────────────

export const insights = {
  weekTogether,
  sharedHistory,
  taskDone,
  allClear,
  overdueReframe,
  streakInsight,
  streakBroken,
  balanceInsight,
  eventSharing,
  eventCreated,
  eventRescheduled,
  eventDeleted,
  bondNarrative,
  xpEarned,
  levelUp,
  emptyConnection,
  emptyDay,
  noTasks,
};

export default insights;
