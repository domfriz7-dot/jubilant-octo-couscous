/**
 * PulseService — Daily Pulse
 *
 * Each person answers one question per day about how they\'re feeling
 * about the relationship. Private by default. Shared only when both answer.
 *
 * When both people have answered, U&Me shows a gentle comparison:
 * "You\'re both feeling close today" or "You\'re on different wavelengths — check in."
 *
 * No AI. No backend. Just AsyncStorage + deterministic matching.
 *
 * ⚡ BACKEND: Replace AsyncStorage with /api/pulse endpoint.
 *   Server would match both users' responses and push notification
 *   when both have answered.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { readJsonWithSchema } from '../utils/storage';
import { zPulseData } from '../config/storageSchemas';
import { todayKey } from '../utils/dateTime';
import { createObservable } from '../utils/observable';

function keyOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

const PULSE_KEY = '@uandme_pulse';

// The pulse options — deliberately simple, no 1-10 scale.
// Emotional, not analytical.
export type PulseOption = { id: string; emoji: string; label: string; weight: number };
export type PulseEntry = {
  connectionId: string;
  date: string; // YYYY-MM-DD
  pulseId: string;
  note: string | null;
  timestamp: string;
};
export type PulseData = { entries: PulseEntry[] };

export const PULSE_OPTIONS: PulseOption[] = [
  { id: 'close',      emoji: '💛', label: 'Feeling close',     weight: 4 },
  { id: 'grateful',   emoji: '🙏', label: 'Grateful',          weight: 4 },
  { id: 'steady',     emoji: '⚖️', label: 'Steady',            weight: 3 },
  { id: 'busy',       emoji: '🏃', label: 'Busy but fine',     weight: 2 },
  { id: 'distant',    emoji: '🌫️', label: 'A bit distant',     weight: 1 },
  { id: 'missing',    emoji: '💭', label: 'Missing them',      weight: 2 },
];

// Daily prompts — rotated by day-of-year.
// Private enough that people actually answer honestly.
export const DAILY_PROMPTS = [
  'How are you and {name} doing?',
  'How connected do you feel today?',
  'If {name} could see one thing about your day, what would it be?',
  'One word for how you feel about {name} right now:',
  "What's one thing {name} did recently that you appreciated?",
  'Are you and {name} in sync this week?',
  'How are things between you two?',
];

function getDayPrompt(firstName: string) {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const template = DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
  return template.replace(/\{name\}/g, firstName);
}

class PulseService {
  private _obs = createObservable();
  constructor() {
    this._obs = createObservable();
  }

  async getPulseData(): Promise<PulseData> {
    return await readJsonWithSchema(PULSE_KEY, zPulseData, { entries: [] }, 'pulseData');
  }

  async savePulseData(data: PulseData): Promise<void> {
    await AsyncStorage.setItem(PULSE_KEY, JSON.stringify(data));
    this._obs.notify();
  }

  /**
   * Record today's pulse for a connection.
   * @param {string} connectionId
   * @param {string} pulseId - one of PULSE_OPTIONS.id
   * @param {string|null} note - optional free-text (kept private)
   */
  async recordPulse(connectionId: string, pulseId: string, note: string | null = null): Promise<PulseEntry> {
    const data = await this.getPulseData();
    const today = todayKey();

    // Remove any existing pulse for this connection today
    data.entries = data.entries.filter((e: { connectionId?: string; date?: string }) => !(e.connectionId === connectionId && e.date === today));

    data.entries.unshift({
      connectionId,
      date: today,
      pulseId,
      note: typeof note === 'string' ? note.trim() || null : null,
      timestamp: new Date().toISOString(),
    });

    // Keep last 90 days
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
    const cutoffKey = todayKey(cutoff);
    data.entries = data.entries.filter((e: { date?: string; [k: string]: unknown }) => e.date >= cutoffKey);

    await this.savePulseData(data);
    return data.entries[0];
  }

  /**
   * Get today's pulse status for a connection.
   * Returns { answered, pulse, prompt }
   */
  async getTodayPulse(connectionId: string, firstName: string): Promise<{ answered: boolean; pulse: PulseOption | null; note: string | null; prompt: string }> {
    const data = await this.getPulseData();
    const today = todayKey();
    const entry = data.entries.find((e: { connectionId?: string; date?: string }) => e.connectionId === connectionId && e.date === today);
    return {
      answered: !!entry,
      pulse: entry ? (PULSE_OPTIONS.find((p) => p.id === entry.pulseId) || null) : null,
      note: entry?.note || null,
      prompt: getDayPrompt(firstName),
    };
  }

  /**
   * Get pulse trend for a connection over the last N days.
   * Returns { trend: 'rising'|'falling'|'steady', avgWeight, recentPulses }
   */
  async getPulseTrend(connectionId: string, days = 7): Promise<{ trend: 'rising' | 'falling' | 'steady'; avgWeight: number; recentPulses: PulseEntry[]; daysAnswered: number }> {
    const data = await this.getPulseData();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const cutoffKey = todayKey(cutoff);

    const recent: PulseEntry[] = data.entries
      .filter((e: { connectionId?: string; date?: string }) => e.connectionId === connectionId && e.date >= cutoffKey)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (recent.length < 2) return { trend: 'steady', avgWeight: 3, recentPulses: recent, daysAnswered: recent.length };

    const weights: number[] = recent.map((e) => {
      const opt = PULSE_OPTIONS.find((p) => p.id === e.pulseId);
      return opt?.weight ?? 3;
    });

    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    const firstHalf = weights.slice(0, Math.floor(weights.length / 2));
    const secondHalf = weights.slice(Math.floor(weights.length / 2));
    const firstAvg = firstHalf.length ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : avg;
    const secondAvg = secondHalf.length ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : avg;

    let trend: 'rising' | 'falling' | 'steady' = 'steady';
    if (secondAvg - firstAvg > 0.5) trend = 'rising';
    else if (firstAvg - secondAvg > 0.5) trend = 'falling';

    return { trend, avgWeight: avg, recentPulses: recent, daysAnswered: recent.length };
  }

  /** Used by health scoring & dashboards */
  async getRecentPulses(connectionId: string, days = 30): Promise<PulseEntry[]> {
    const data = await this.getPulseData();
    const cutoffKey = keyOffset(-Math.max(1, days) + 1);
    return (data.entries || []).filter((e: { connectionId?: string; date?: string }) => e.connectionId === connectionId && e.date >= cutoffKey);
  }

  subscribe(listener: () => void) {
    return this._obs.subscribe(listener);
  }

}

export default new PulseService();
export { getDayPrompt, todayKey };
