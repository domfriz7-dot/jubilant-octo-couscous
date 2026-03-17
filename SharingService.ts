import AsyncStorage from '@react-native-async-storage/async-storage';
import PulseService, { todayKey } from './PulseService';
import { createObservable } from '../utils/observable';
import type { RitualEntry } from '../types/shared';
import { logError } from './logger';

/**
 * DailyRitualService — 30–60s daily check-in that feeds:
 * - bond narrative
 * - weekly report
 * - conflict predictor
 *
 * Local-first, backend-ready.
 *
 * Entry shape:
 * {
 *   connectionId: string,
 *   date: 'YYYY-MM-DD',
 *   pulseId: string,               // optional, also recorded into PulseService for trend
 *   appreciation: string|null,
 *   need: string|null,
 *   stress: 1..5|null,
 *   energy: 1..5|null,
 *   timestamp: ISO string
 * }
 */
const KEY = '@uandme_daily_ritual_v1';

function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

class DailyRitualService {
  private _obs = createObservable();

  async _get() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { entries: [] };
    } catch {
      return { entries: [] };
    }
  }

  async _save(data) {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
    this._obs.notify();
  }

  subscribe(listener) {
    return this._obs.subscribe(listener);
  }


  async getToday(connectionId) {
    const data = await this._get();
    const today = todayKey();
    return data.entries.find((e: RitualEntry) => e.connectionId === connectionId && e.date === today) || null;
  }

  async getRecent(connectionId, days = 14) {
    const data = await this._get();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (days - 1));
    const cutoffKey = todayKey(cutoff);
    return data.entries
      .filter((e: RitualEntry) => e.connectionId === connectionId && e.date >= cutoffKey)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  async record(connectionId, payload) {
    const data = await this._get();
    const date = payload?.date || todayKey();

    data.entries = data.entries.filter((e: RitualEntry) => !(e.connectionId === connectionId && e.date === date));

    const entry = {
      connectionId,
      date,
      pulseId: payload?.pulseId || null,
      appreciation: payload?.appreciation?.trim?.() ? payload.appreciation.trim() : null,
      need: payload?.need?.trim?.() ? payload.need.trim() : null,
      stress: clampInt(payload?.stress, 1, 5),
      energy: clampInt(payload?.energy, 1, 5),
      timestamp: new Date().toISOString(),
    };

    data.entries.unshift(entry);

    // Keep last 180 days per connection (lightweight)
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 180);
    const cutoffKey = todayKey(cutoff);
    data.entries = data.entries.filter((e: RitualEntry) => e.date >= cutoffKey);

    await this._save(data);

    // Feed Pulse trend when pulseId is present (keeps your existing analytics coherent)
    if (entry.pulseId) {
      try { await PulseService.recordPulse(connectionId, entry.pulseId, entry.need || entry.appreciation || null); }
      catch (e) { logError('DailyRitualService.recordPulse', e); }
    }

    return entry;
  }

  /**
   * Compute a compact summary for engines/UI.
   */
  async getSummary(connectionId, days = 7) {
    const recent = await this.getRecent(connectionId, days);
    const today = todayKey();
    const todayEntry = recent.find((e: RitualEntry) => e.date === today) || null;

    const byDate = new Map(recent.map((e: RitualEntry) => [e.date, e]));
    // streak counts consecutive days ending today (or yesterday if no entry today)
    const startFrom = todayEntry ? 0 : 1;
    let streak = 0;
    for (let i = startFrom; i < 60; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = todayKey(d);
      if (byDate.has(k)) streak += 1;
      else break;
    }

    const avg = (arr: number[]) => {
      const vals = arr.filter((v) => typeof v === 'number' && Number.isFinite(v));
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const stressAvg = avg(recent.map((e: RitualEntry) => e.stressLevel));
    const energyAvg = avg(recent.map((e: RitualEntry) => e.energyLevel));
    const needsCount = recent.filter((e: RitualEntry) => ((e as RitualEntry & { need?: string }).need || '').length > 0).length;
    const appreciationCount = recent.filter((e: RitualEntry) => (e.appreciation || '').length > 0).length;

    return {
      days,
      todayDone: !!todayEntry,
      todayEntry,
      recent,
      streak,
      stressAvg,
      energyAvg,
      needsCount,
      appreciationCount,
    };
  }
}

export default new DailyRitualService();