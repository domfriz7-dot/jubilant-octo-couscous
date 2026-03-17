import AsyncStorage from '@react-native-async-storage/async-storage';
import TasksService from './TasksService';
import CalendarService, { type CalendarEventCreateInput } from './CalendarService';
import type { CalendarEvent } from '../types/calendar';
import { todayKey } from '../utils/dateTime';
import { logError } from '../services/logger';
import { createObservable } from '../utils/observable';
import { getCurrentUserId } from './IdentityService';

/**
 * AccountabilityService — computes mutual accountability data.
 *
 * Does NOT own storage. Reads from TasksService + CalendarService
 * and computes per-connection accountability metrics.
 *
 * ⚡ BACKEND: These computations would be server-side aggregations.
 */

const STREAK_KEY = '@uandme_mutual_streaks';

class AccountabilityService {
  // Observable for UI refresh subscriptions
  private _obs = createObservable();

  // ── Core: compute accountability snapshot for one connection ──

  async getSnapshot(connectionId) {
    const meId = getCurrentUserId();
    const [tasks, events, streakData] = await Promise.all([
      TasksService.getTasks(),
      CalendarService.getEvents(),
      this._loadStreaks(),
    ]);

    const now = new Date();
    const today = todayKey();
    const weekStart = this._weekStart(now);

    // Tasks that involve this connection
    const sharedTasks = tasks.filter((t) =>
      t.sharedWith?.includes(connectionId) ||
      t.assignedTo === connectionId ||
      (t.assignedTo === getCurrentUserId() && t.sharedWith?.includes(connectionId))
    );

    // This week's shared tasks
    const weekTasks = sharedTasks.filter((t) => t.dueDate && t.dueDate >= weekStart && t.dueDate <= today);

    // Completions
    const myCompletions = weekTasks.filter((t) =>
      t.completed && (!t.assignedTo || t.assignedTo === getCurrentUserId() || t.assignedTo === meId)
    ).length;
    const theirCompletions = weekTasks.filter((t) =>
      t.completed && t.assignedTo === connectionId
    ).length;
    const myTotal = weekTasks.filter((t) =>
      !t.assignedTo || t.assignedTo === getCurrentUserId() || t.assignedTo === meId
    ).length;
    const theirTotal = weekTasks.filter((t) =>
      t.assignedTo === connectionId
    ).length;

    // Missed (overdue + not completed)
    const missedByMe = sharedTasks.filter((t) =>
      !t.completed && t.dueDate && t.dueDate < today &&
      (!t.assignedTo || t.assignedTo === getCurrentUserId() || t.assignedTo === meId)
    );
    const missedByThem = sharedTasks.filter((t) =>
      !t.completed && t.dueDate && t.dueDate < today &&
      t.assignedTo === connectionId
    );

    // Balance score: 50 = perfect, <50 = I\'m behind, >50 = they\'re behind
    const totalCompleted = myCompletions + theirCompletions;
    const totalTasks = myTotal + theirTotal;
    let balance = 50; // default = even
    if (totalCompleted > 0) {
      const myRatio = myTotal > 0 ? myCompletions / myTotal : 1;
      const theirRatio = theirTotal > 0 ? theirCompletions / theirTotal : 1;
      balance = Math.round(((myRatio / (myRatio + theirRatio || 1)) * 100));
    }

    // Mutual streak
    const streak = streakData[connectionId] || { current: 0, best: 0, lastDate: null };

    // Shared events this week
    const sharedEvents = events.filter((e: CalendarEvent) =>
      (e.sharedWith?.includes(connectionId) || e.createdBy === connectionId) &&
      e.date >= weekStart && e.date <= this._addDays(today, 7)
    );

    // Generate nudge message
    const nudge = this._generateNudge({
      balance, myCompletions, theirCompletions, myTotal, theirTotal,
      missedByMe: missedByMe.length, missedByThem: missedByThem.length,
      streak: streak.current,
    });

    return {
      connectionId,
      // Balance
      balance,
      myCompletions, theirCompletions,
      myTotal, theirTotal,
      totalTasks: sharedTasks.length,
      // Missed
      missedByMe, missedByThem,
      totalMissed: missedByMe.length + missedByThem.length,
      // Streak
      streak,
      // Events
      sharedEventsCount: sharedEvents.length,
      // Nudge
      nudge,
    };
  }

  // ── Compute for all connections at once (HomeScreen) ──

  async getOverview(connectionIds) {
    const snapshots = await Promise.all(connectionIds.map((id: string) => this.getSnapshot(id)));
    const active = snapshots.filter((s) => s.totalTasks > 0 || s.sharedEventsCount > 0);

    // Global balance across all connections
    const totalMy = active.reduce((s, a) => s + a.myCompletions, 0);
    const totalTheir = active.reduce((s, a) => s + a.theirCompletions, 0);
    const totalMissed = active.reduce((s, a) => s + a.totalMissed, 0);
    const bestStreak = Math.max(0, ...active.map((a) => a.streak.current));

    // Find the most imbalanced connection
    let mostImbalanced = null;
    let worstBalance = 50;
    for (const snap of active) {
      const dist = Math.abs(snap.balance - 50);
      if (dist > Math.abs(worstBalance - 50)) {
        worstBalance = snap.balance;
        mostImbalanced = snap;
      }
    }

    return { snapshots: active, totalMy, totalTheir, totalMissed, bestStreak, mostImbalanced };
  }

  // ── Update mutual streak (call daily or on task completion) ──

  async updateStreak(connectionId) {
    const streaks = await this._loadStreaks();
    const today = todayKey();
    const tasks = await TasksService.getTasks();
    const meId = getCurrentUserId();

    const sharedTasks = tasks.filter((t) =>
      t.sharedWith?.includes(connectionId) || t.assignedTo === connectionId
    );

    // Did both people complete something today?
    const myDone = sharedTasks.some((t) =>
      t.completed && t.completedAt?.startsWith(today) &&
      (!t.assignedTo || t.assignedTo === getCurrentUserId() || t.assignedTo === meId)
    );
    const theirDone = sharedTasks.some((t) =>
      t.completed && t.completedAt?.startsWith(today) &&
      t.assignedTo === connectionId
    );

    const entry = streaks[connectionId] || { current: 0, best: 0, lastDate: null };
    const yesterday = this._addDays(today, -1);

    if (myDone && theirDone) {
      // Both completed today
      if (entry.lastDate === today) {
        // Already counted today
      } else if (entry.lastDate === yesterday) {
        entry.current += 1;
      } else {
        entry.current = 1;
      }
      entry.lastDate = today;
      if (entry.current > entry.best) entry.best = entry.current;
    } else if (entry.lastDate && entry.lastDate < yesterday) {
      // Streak broken — but we freeze, not reset. Resume when both active again.
      // Only actually break after 3 days of inactivity
      const daysSince = this._daysBetween(entry.lastDate, today);
      if (daysSince > 3) {
        entry.current = 0;
      }
      // Otherwise streak is frozen — stays at current value
    }

    streaks[connectionId] = entry;
    await this._saveStreaks(streaks);
    this._notify();
    return entry;
  }

  // ── Nudge generation ──────────────────────────────────

  _generateNudge({ balance, myCompletions, theirCompletions, myTotal, theirTotal, missedByMe, missedByThem, streak }) {
    if (missedByMe > 0 && missedByThem > 0) {
      return { type: 'warning', icon: 'alert-circle', text: `${missedByMe + missedByThem} things slipping between you — time for a check-in` };
    }
    if (missedByMe > 0) {
      return { type: 'gentle', icon: 'clock', text: `You have ${missedByMe} thing${missedByMe > 1 ? 's' : ''} they\'re counting on` };
    }
    if (missedByThem > 0) {
      return { type: 'info', icon: 'clock', text: `They have ${missedByThem} thing${missedByThem > 1 ? 's' : ''} you\'re waiting on — worth a gentle nudge?` };
    }
    if (balance < 30) {
      return { type: 'gentle', icon: 'trending-down', text: "They\'ve been picking up your slack this week" };
    }
    if (balance > 70) {
      return { type: 'info', icon: 'trending-up', text: "You\'ve been doing the heavy lifting — they owe you one" };
    }
    if (streak >= 7) {
      return { type: 'celebration', icon: 'zap', text: `${streak} days showing up for each other — that\'s real` };
    }
    if (streak >= 3) {
      return { type: 'positive', icon: 'activity', text: `${streak} days in rhythm together` };
    }
    if (myCompletions > 0 && theirCompletions > 0) {
      return { type: 'positive', icon: 'check-circle', text: 'You\'re both pulling your weight this week' };
    }
    if (myTotal === 0 && theirTotal === 0) {
      return { type: 'neutral', icon: 'plus', text: 'Nothing between you yet — start with something small' };
    }
    return { type: 'neutral', icon: 'users', text: 'The more you share, the closer you get' };
  }

  // ── Storage helpers ────────────────────────────────────

  async _loadStreaks() {
    try { const raw = await AsyncStorage.getItem(STREAK_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  }

  async _saveStreaks(data) {
    try { await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data)); } catch (e) { logError('AccountabilityService', e); }
  }

  _weekStart(d) {
    const dt = new Date(d); const day = dt.getDay();
    dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
    return todayKey(dt);
  }

  _addDays(dateStr, n) {
    const d = new Date(`${dateStr}T00:00:00`); d.setDate(d.getDate() + n);
    return todayKey(d);
  }

  _daysBetween(a, b) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  // ── Subscriptions ──────────────────────────────────────

  subscribe(listener) {
    return this._obs.subscribe(listener);
  }


  _notify() { this._obs.notify(); }

}

export default new AccountabilityService();
