import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { createObservable } from '../utils/observable';
import { logError } from './logger';
import NativeCalendarSync from './NativeCalendarSync';
import { ensureIdentity, getCurrentUserId } from './IdentityService';
import type { CalendarEvent, RSVPStatus, CalendarEventPatch } from '../types/calendar';
import { normalizeCalendarEvent, eventStartISO, eventEndISO } from '../viewModels/calendarEventVM';

/**
 * CalendarService — local-first, backend-ready.
 *
 * BACKEND MIGRATION GUIDE:
 * Replace the body of each method with your API calls.
 * The public interface stays identical so no UI changes needed.
 *
 * ⚠️  expo-sqlite v15 (Expo SDK 54) replaced the entire API:
 *   REMOVED: openDatabase()  db.transaction()  tx.executeSql()
 *   NEW:     openDatabaseAsync()  db.execAsync()  db.getAllAsync()
 *            db.getFirstAsync()  db.runAsync()  db.withTransactionAsync()
 */

const EVENTS_KEY = '@uandme_calendar_events';
const DB_NAME = 'uandme.db';
const EVENTS_TABLE = 'calendar_events_v1';

// Input shape for creating events — omits server-generated fields.
export type CalendarEventCreateInput = Omit<
  CalendarEvent,
  | 'id' | 'createdAt' | 'createdBy' | 'startTime' | 'endTime'
  | 'rsvp' | 'rsvpAt' | 'rsvpNotes' | 'proposals' | 'reschedules'
  | 'rescheduleCount' | 'requiresReconfirm' | 'cancelled'
  | 'cancelledAt' | 'cancelledBy' | 'cancelReason'
> & {
  sharedWith?: string[] | string;
};

// One shared async DB connection for the lifetime of the app.
// openDatabaseAsync is the v15 entry point (openDatabase was removed).
let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return _dbPromise;
}

class CalendarService {
  private currentUserId: string;
  private _ready: Promise<void>;
  private _obs = createObservable();

  constructor() {
    this.currentUserId = getCurrentUserId();
    this._ready = this._init();
  }

  private async _init() {
    try {
      this.currentUserId = await ensureIdentity();
    } catch {
      // keep best-effort cached id
      // Intentionally ignored — non-critical failure
    }
    await this._initDb();
  }

  // ── Helpers ─────────────────────────────────────────────

  private _nowIso() {
    return new Date().toISOString();
  }

  private _ensureEventShape(e: unknown): CalendarEvent {
    return normalizeCalendarEvent(e, this.currentUserId);
  }

  private _migrateEvents(events: unknown[]): CalendarEvent[] {
    if (!Array.isArray(events)) return [];
    return events.map((e) => this._ensureEventShape(e));
  }

  // ── DB init ─────────────────────────────────────────────

  private async _initDb() {
    try {
      const db = await getDb();

      // execAsync runs multiple statements separated by semicolons
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${EVENTS_TABLE} (
          id        TEXT PRIMARY KEY NOT NULL,
          startTime TEXT,
          endTime   TEXT,
          updatedAt TEXT,
          data      TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_${EVENTS_TABLE}_start
          ON ${EVENTS_TABLE}(startTime);
        CREATE INDEX IF NOT EXISTS idx_${EVENTS_TABLE}_end
          ON ${EVENTS_TABLE}(endTime);
      `);

      // Migrate from AsyncStorage on first launch
      const row = await (db.getFirstAsync as <T>(sql: string) => Promise<T | null>)<{ c: number }>(
        `SELECT COUNT(*) AS c FROM ${EVENTS_TABLE};`
      );
      if ((row?.c ?? 0) === 0) {
        try {
          const json = await AsyncStorage.getItem(EVENTS_KEY);
          const raw = json ? JSON.parse(json) : this._defaultEvents();
          const migrated = this._migrateEvents(raw);
          if (migrated.length) await this._replaceAllEvents(migrated);
        } catch (e) {
          logError('CalendarService._initDb.migrate', e);
        }
      }
    } catch (e) {
      // DB init failure must not brick the app — getEvents() falls back to AsyncStorage.
      logError('CalendarService._initDb', e);
    }
  }

  // ── Private DB I/O ──────────────────────────────────────

  private async _readAllEvents(): Promise<CalendarEvent[]> {
    const db = await getDb();
    const rows = await (db.getAllAsync as <T>(sql: string) => Promise<T[]>)<{ data: string }>(
      `SELECT data FROM ${EVENTS_TABLE} ORDER BY startTime ASC;`
    );
    const out: CalendarEvent[] = [];
    for (const row of rows) {
      try {
        out.push(JSON.parse(row.data));
      } catch {
        // ignore corrupt row
        // Intentionally ignored — non-critical failure
      }
    }
    return out;
  }

  private async _replaceAllEvents(events: CalendarEvent[]) {
    const db = await getDb();
    const now = this._nowIso();

    // withTransactionAsync guarantees atomicity across all writes
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM ${EVENTS_TABLE};`);
      for (const e of events) {
        const ev = this._ensureEventShape(e);
        await db.runAsync(
          `INSERT OR REPLACE INTO ${EVENTS_TABLE}
             (id, startTime, endTime, updatedAt, data)
           VALUES (?, ?, ?, ?, ?);`,
          [ev.id, eventStartISO(ev), eventEndISO(ev), now, JSON.stringify(ev)]
        );
      }
    });
  }

  // ── Public API ──────────────────────────────────────────

  async getEvents(): Promise<CalendarEvent[]> {
    try {
      await this._ready;
      const raw = await this._readAllEvents();
      return this._migrateEvents(raw);
    } catch (e) {
      logError('CalendarService.getEvents', e);
      // Fallback to AsyncStorage (e.g. DB unavailable on first cold start)
      try {
        const json = await AsyncStorage.getItem(EVENTS_KEY);
        const raw = json ? JSON.parse(json) : this._defaultEvents();
        return this._migrateEvents(raw);
      } catch {
        return this._migrateEvents(this._defaultEvents());
      }
    }
  }

  async saveEvents(events: CalendarEvent[]) {
    try {
      await this._ready;
      const now = this._nowIso();
      const normalized = events.map((e) => {
        const ev = this._ensureEventShape(e);
        // Ensure merge/sync metadata is present.
        const updatedAt = typeof ev.updatedAt === 'string' && ev.updatedAt ? ev.updatedAt : now;
        return { ...ev, updatedAt, updatedBy: ev.updatedBy ?? this.currentUserId };
      });

      await this._replaceAllEvents(normalized);
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(normalized));
      this._notify();

      // Best-effort backend sync (non-blocking).
      // Kept here to avoid UI changes; BackendService decides if Firebase is configured.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { queueCalendarSync } = require('./backend/sync/CalendarFirestoreSync');
      queueCalendarSync(normalized);
    } catch (e) {
      logError('CalendarService.saveEvents', e);
    }
  }

  async addEvent(event: CalendarEventCreateInput): Promise<CalendarEvent> {
    await this._ready;
    const events = await this.getEvents();
    const now = this._nowIso();
    const sharedWith = Array.isArray(event.sharedWith)
      ? event.sharedWith
      : event.sharedWith ? [event.sharedWith] : [];

    const rsvp: Record<string, RSVPStatus> = { [this.currentUserId]: 'accepted' };
    const rsvpAt: Record<string, string | null> = { [this.currentUserId]: now };
    for (const uid of sharedWith) {
      rsvp[uid] = 'pending';
      rsvpAt[uid] = null;
    }

    const newEvent = this._ensureEventShape({
      ...event,
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdBy: this.currentUserId,
      createdAt: now,
      updatedAt: now,
      updatedBy: this.currentUserId,
      sharedWith,
      rsvp,
      rsvpAt,
      proposals: [],
      reschedules: [],
      rescheduleCount: 0,
      requiresReconfirm: false,
      cancelled: false,
      cancelledAt: null,
      cancelledBy: null,
    });

    events.push(newEvent);
    await this.saveEvents(events);
    NativeCalendarSync.syncEvent(newEvent).catch((e: CalendarEvent) =>
      logError('CalSvc.addEvent.nativeSync', e)
    );
    // Push shared events to Firestore so the other device receives them
    if (sharedWith.length > 0) {
      import('../services/SharingService').then(({ pushSharedEvent }) => {
        pushSharedEvent(newEvent).catch((e: CalendarEvent) =>
          logError('CalSvc.addEvent.shareSync', e)
        );
      }).catch(() => {});
    }
    return newEvent;
  }

  async updateEvent(eventId: string, patch: CalendarEventPatch): Promise<CalendarEvent | null> {
    await this._ready;
    const events = await this.getEvents();
    const idx = events.findIndex((e: CalendarEvent) => e.id === eventId);
    if (idx === -1) return null;

    const before = this._ensureEventShape(events[idx]);
    const updates = patch || {};
    const after = this._ensureEventShape({ ...before, ...updates } as CalendarEvent);

    // Stamp mutation metadata
    after.updatedAt = this._nowIso();
    after.updatedBy = this.currentUserId;

    // Cancellation stamping
    if (updates.cancelled === true && !before.cancelled) {
      after.cancelled = true;
      after.cancelledAt = updates.cancelledAt || this._nowIso();
      after.cancelledBy = updates.cancelledBy || this.currentUserId;
      if (updates.cancelReason) after.cancelReason = updates.cancelReason;
    }
    if (updates.cancelled === false && before.cancelled) {
      after.cancelled = false;
      after.cancelledAt = null;
      after.cancelledBy = null;
      after.cancelReason = null;
    }

    // Reschedule detection
    const changed =
      before.date !== after.date ||
      before.time !== after.time ||
      before.durationMinutes !== after.durationMinutes;

    if (changed) {
      const res = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        at: this._nowIso(),
        by: this.currentUserId,
        from: { date: before.date, time: before.time, durationMinutes: before.durationMinutes },
        to: { date: after.date, time: after.time, durationMinutes: after.durationMinutes },
      };
      after.reschedules = [...(before.reschedules || []), res];
      after.rescheduleCount = (before.rescheduleCount || 0) + 1;

      const rsvp = { ...(after.rsvp || {}) } as Record<string, RSVPStatus>;
      const rsvpAt = { ...(after.rsvpAt || {}) } as Record<string, string | null>;
      Object.keys(rsvp).forEach((uid: string) => {
        if (uid === after.createdBy) return;
        rsvp[uid] = 'pending';
        rsvpAt[uid] = null;
      });
      after.rsvp = rsvp;
      after.rsvpAt = rsvpAt;
      after.requiresReconfirm = true;
    }

    events[idx] = after;
    await this.saveEvents(events);
    NativeCalendarSync.syncEvent(after).catch((e: CalendarEvent) =>
      logError('CalSvc.updateEvent.nativeSync', e)
    );
    // Keep shared event in sync across platforms
    const sharedWithAfter = Array.isArray(after.sharedWith) ? after.sharedWith : [];
    if (sharedWithAfter.length > 0) {
      import('../services/SharingService').then(({ pushSharedEvent }) => {
        pushSharedEvent(after).catch((e: CalendarEvent) =>
          logError('CalSvc.updateEvent.shareSync', e)
        );
      }).catch(() => {});
    }
    return after;
  }

  async deleteEvent(eventId: string) {
    await this._ready;
    const events = await this.getEvents();
    const eventToDelete = events.find((e: CalendarEvent) => e.id === eventId);
    await this.saveEvents(events.filter((e: CalendarEvent) => e.id !== eventId));
    NativeCalendarSync.removeEvent(eventId).catch((e: CalendarEvent) =>
      logError('CalSvc.deleteEvent.nativeSync', e)
    );
    // Soft-delete shared event on Firestore so other participants see the cancellation
    const sharedWith = Array.isArray(eventToDelete?.sharedWith) ? eventToDelete.sharedWith : [];
    if (sharedWith.length > 0) {
      import('../services/SharingService').then(({ deleteSharedEvent }) => {
        deleteSharedEvent(eventId).catch((e: CalendarEvent) =>
          logError('CalSvc.deleteEvent.shareSync', e)
        );
      }).catch(() => {});
    }
  }

  async getEventsForDate(date: string) {
    const events = await this.getEvents();
    return events.filter((e: CalendarEvent) => e.date === date);
  }

  async getSharedEvents() {
    await this._ready;
    const events = await this.getEvents();
    return events.filter(
      (e: CalendarEvent) =>
        (e.sharedWith || []).includes(this.currentUserId) ||
        e.createdBy === this.currentUserId
    );
  }

  async getEventById(eventId: string) {
    const events = await this.getEvents();
    return events.find((e: CalendarEvent) => e.id === eventId) || null;
  }

  // ── RSVP / proposals ────────────────────────────────────

  async respondToInvite(
    eventId: string,
    status: RSVPStatus,
    { userId = this.currentUserId, note = null }: { userId?: string; note?: string | null } = {}
  ) {
    await this._ready;
    const events = await this.getEvents();
    const idx = events.findIndex((e: CalendarEvent) => e.id === eventId);
    if (idx === -1) return null;
    const ev = this._ensureEventShape(events[idx]);

    const next: CalendarEvent = {
      ...ev,
      rsvp: { ...(ev.rsvp || {}), [userId]: status },
      rsvpAt: { ...(ev.rsvpAt || {}), [userId]: this._nowIso() },
    };

    if (note) {
      const notes = Array.isArray(next.rsvpNotes) ? next.rsvpNotes : [];
      notes.push({ userId, at: this._nowIso(), note });
      next.rsvpNotes = notes.slice(-20);
    }

    const allAccepted = Object.keys(next.rsvp || {}).every(
      (uid: string) => next.rsvp?.[uid] === 'accepted'
    );
    if (allAccepted) next.requiresReconfirm = false;

    events[idx] = this._ensureEventShape(next);
    await this.saveEvents(events);
    return events[idx];
  }

  async proposeAlternative(
    eventId: string,
    proposal: Record<string, unknown>,
    { userId = this.currentUserId }: { userId?: string } = {}
  ) {
    const events = await this.getEvents();
    const idx = events.findIndex((e: CalendarEvent) => e.id === eventId);
    if (idx === -1) return null;
    const ev = this._ensureEventShape(events[idx]);

    const p = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      at: this._nowIso(),
      by: userId,
      status: 'open',
      ...proposal,
    };

    events[idx] = this._ensureEventShape({ ...ev, proposals: [...(ev.proposals || []), p] });
    await this.saveEvents(events);
    return events[idx];
  }

  async acceptProposal(
    eventId: string,
    proposalId: string,
    { userId = this.currentUserId }: { userId?: string } = {}
  ) {
    const events = await this.getEvents();
    const idx = events.findIndex((e: CalendarEvent) => e.id === eventId);
    if (idx === -1) return null;
    const ev = this._ensureEventShape(events[idx]);
    const proposal = (ev.proposals || []).find((x) => x.id === proposalId);
    if (!proposal) return ev;

    const proposals = (ev.proposals || []).map((x) =>
      x.id === proposalId
        ? { ...x, status: 'accepted', decidedAt: this._nowIso(), decidedBy: userId }
        : x
    );
    events[idx] = this._ensureEventShape({ ...ev, proposals, acceptedProposalId: proposalId });
    await this.saveEvents(events);

    await this.updateEvent(eventId, {
      date: proposal.date || ev.date,
      time: proposal.time || ev.time,
      durationMinutes: proposal.durationMinutes ?? ev.durationMinutes,
      acceptedProposalId: proposalId,
      requiresReconfirm: true,
    });

    return await this.getEventById(eventId);
  }

  async rejectProposal(
    eventId: string,
    proposalId: string,
    { userId = this.currentUserId, note = null }: { userId?: string; note?: string | null } = {}
  ) {
    const events = await this.getEvents();
    const idx = events.findIndex((e: CalendarEvent) => e.id === eventId);
    if (idx === -1) return null;
    const ev = this._ensureEventShape(events[idx]);
    const proposals = (ev.proposals || []).map((x) =>
      x.id === proposalId
        ? { ...x, status: 'rejected', decidedAt: this._nowIso(), decidedBy: userId, note }
        : x
    );
    events[idx] = this._ensureEventShape({ ...ev, proposals });
    await this.saveEvents(events);
    return events[idx];
  }

  async cancelEvent(
    eventId: string,
    { userId = this.currentUserId, reason = null }: { userId?: string; reason?: string | null } = {}
  ) {
    await this._ready;
    return await this.updateEvent(eventId, {
      cancelled: true,
      cancelledAt: this._nowIso(),
      cancelledBy: userId,
      cancelReason: reason,
    });
  }

  // ── Deprecated ──────────────────────────────────────────

  getUsers() {
    logError(
      'CalendarService.getUsers.deprecated',
      new Error('Use ConnectionsService.getAllUsers() instead.')
    );
    return [];
  }

  getUserById(_userId: string) {
    return undefined;
  }

  // ── Subscriptions ───────────────────────────────────────

  subscribe(listener: () => void) {
    return this._obs.subscribe(listener);
  }

  private _notify() {
    this._obs.notify();
  }

  async clearAll() {
    try {
      await this._ready;
      const db = await getDb();
      await db.runAsync(`DELETE FROM ${EVENTS_TABLE};`);
    } catch (e) {
      logError('CalendarService.clearAll.db', e);
    }
    try {
      await AsyncStorage.removeItem(EVENTS_KEY);
    } catch (e) {
      logError('CalendarService.clearAll.storage', e);
    }
    this._notify();
  }

  private _defaultEvents(): CalendarEvent[] {
    return [];
  }
}

export default new CalendarService();
