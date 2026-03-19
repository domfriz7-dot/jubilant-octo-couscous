// src/services/NativeCalendarSync.js
//
// 2-way calendar sync: writes U&Me events to the native device calendar.
// Creates a dedicated "U&Me" calendar so events are visible in Apple/Google Calendar.
//
// Usage:
//   await NativeCalendarSync.init();              // Request permissions + find/create calendar
//   await NativeCalendarSync.syncEvent(event);    // Write one event
//   await NativeCalendarSync.removeEvent(eventId); // Remove from native
//   await NativeCalendarSync.syncAll(events);     // Bulk sync

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError, logEvent } from './logger';

const NATIVE_CAL_ID_KEY = '@uandme_native_calendar_id';
const EVENT_MAP_KEY = '@uandme_native_event_map'; // { [uandmeId]: nativeEventId }

let _Calendar: Record<string, unknown> | null = null;
function getCal() {
  if (_Calendar) return _Calendar;
  try { _Calendar = require('expo-calendar'); } catch (e) {
      logError('NativeCalendarSync.getCalendar', e, { where: 'NativeCalendarSync.getCalendar' });
      _Calendar = null;
    }
  return _Calendar;
}

class NativeCalendarSync {
  private _calendarId: string | null;
  private _eventMap: Record<string, string>;
  private _ready: boolean;

  constructor() {
    this._calendarId = null;
    this._eventMap = {};
    this._ready = false;
  }

  // ── Initialization ──────────────────────────────────────

  async init() {
    const Cal = getCal();
    if (!Cal) return false;
    try {
      const { status } = await Cal.requestCalendarPermissionsAsync();
      if (status !== 'granted') { logEvent('NativeCalSync.PermDenied'); return false; }
      await this._loadEventMap();
      this._calendarId = await this._getOrCreateCalendar();
      this._ready = !!this._calendarId;
      if (this._ready) logEvent('NativeCalSync.Ready', { calId: this._calendarId });
      return this._ready;
    } catch (e) { logError('NativeCalSync.init', e); return false; }
  }

  get isReady() { return this._ready; }

  // ── Find or create the U&Me calendar ────────────────────

  async _getOrCreateCalendar() {
    const Cal = getCal();
    if (!Cal) return null;

    // Check saved ID still exists
    try {
      const savedId = await AsyncStorage.getItem(NATIVE_CAL_ID_KEY);
      if (savedId) {
        const cals = await Cal.getCalendarsAsync(Cal.EntityTypes.EVENT);
        if (cals.some((c: { id: string }) => c.id === savedId)) return savedId;
      }
    } catch (e) { logError('NativeCalSync.lookup', e); }

    // Create new U&Me calendar
    try {
      let calId;
      if (Platform.OS === 'ios') {
        const cals = await Cal.getCalendarsAsync(Cal.EntityTypes.EVENT);
        const src = (cals.find((c: { source?: { isLocalAccount?: boolean }; allowsModifications?: boolean }) => c.source?.isLocalAccount) || cals.find((c: { allowsModifications?: boolean }) => c.allowsModifications) || cals[0])?.source;
        if (!src?.id) {
          logError('NativeCalSync.noSource', new Error('No valid iOS calendar source'));
          return null;
        }
        calId = await Cal.createCalendarAsync({
          title: 'U&Me', color: '#B09080', entityType: Cal.EntityTypes.EVENT,
          sourceId: src.id, name: 'uandme', ownerAccount: 'personal',
          accessLevel: Cal.CalendarAccessLevel.OWNER,
        });
      } else {
        calId = await Cal.createCalendarAsync({
          title: 'U&Me', color: '#B09080', entityType: Cal.EntityTypes.EVENT,
          source: { isLocalAccount: true, name: 'U&Me', type: 'LOCAL' },
          name: 'uandme', ownerAccount: 'uandme', accessLevel: 'owner',
        });
      }
      await AsyncStorage.setItem(NATIVE_CAL_ID_KEY, calId);
      logEvent('NativeCalSync.Created', { calId });
      return calId;
    } catch (e) { logError('NativeCalSync.create', e); return null; }
  }

  // ── Sync a single event ─────────────────────────────────

  async syncEvent(event: Record<string, unknown>): Promise<string | null> {
    if (!this._ready || !event?.id) return null;
    const Cal = getCal();
    if (!Cal) return null;

    try {
      const startDate = this._toDate(event.date, event.time || '12:00');
      const dur = event.durationMinutes || event.durationMins || 60;
      const endDate = new Date(startDate.getTime() + dur * 60 * 1000);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const native = {
        title: event.title || 'U&Me Event',
        startDate, endDate, location: event.location || '',
        notes: event.notes || 'Managed by U&Me', timeZone: tz,
        calendarId: this._calendarId,
      };

      const existingId = this._eventMap[event.id];
      if (existingId) {
        try {
          await Cal.updateEventAsync(existingId, native);
          return existingId;
        } catch (e) {
          logError('NativeCalSync.update', e);
          // Deleted externally — fall through to create
        }
      }

      const nativeId = await Cal.createEventAsync(this._calendarId, native);
      this._eventMap[event.id] = nativeId;
      await this._saveEventMap();
      logEvent('NativeCalSync.Synced', { id: event.id });
      return nativeId;
    } catch (e) { logError('NativeCalSync.syncEvent', e); return null; }
  }

  // ── Remove a native event ───────────────────────────────

  async removeEvent(eventId: string): Promise<void> {
    if (!this._ready) return;
    const Cal = getCal();
    if (!Cal) return;
    const nativeId = this._eventMap[eventId];
    if (!nativeId) return;
    try { await Cal.deleteEventAsync(nativeId); }
    catch (e) { logError('NativeCalSync.remove', e); }
    delete this._eventMap[eventId];
    await this._saveEventMap();
  }

  // ── Bulk sync ───────────────────────────────────────────

  async syncAll(events: Array<Record<string, unknown>>): Promise<{ synced: number; errors: number }> {
    if (!this._ready || !Array.isArray(events)) return { synced: 0, errors: 0 };
    let synced = 0, errors = 0;
    for (const ev of events) {
      if (ev.cancelled) { await this.removeEvent(ev.id); continue; }
      (await this.syncEvent(ev)) ? synced++ : errors++;
    }
    logEvent('NativeCalSync.Bulk', { synced, errors, total: events.length });
    return { synced, errors };
  }

  // ── Helpers ─────────────────────────────────────────────

  _toDate(dateStr: string, timeStr: string): Date {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    const [h, mi] = String(timeStr).split(':').map(Number);
    return new Date(y, m - 1, d, h || 12, mi || 0, 0);
  }

  async _loadEventMap() {
    try { const r = await AsyncStorage.getItem(EVENT_MAP_KEY); this._eventMap = r ? JSON.parse(r) : {}; }
    catch (e) {
      logError('NativeCalendarSync.loadEventMap', e, { where: 'NativeCalendarSync.loadEventMap' });
      this._eventMap = {}; }
  }

  async _saveEventMap() {
    try { await AsyncStorage.setItem(EVENT_MAP_KEY, JSON.stringify(this._eventMap)); }
    catch (e) { logError('NativeCalSync.saveMap', e); }
  }

  async hasPermissions() {
    const Cal = getCal();
    if (!Cal) return false;
    try { return (await Cal.getCalendarPermissionsAsync()).status === 'granted'; }
    catch (e) {
      logError('NativeCalendarSync.op', e, { where: 'NativeCalendarSync.op' });
      return false;
    }
  }
}

export default new NativeCalendarSync();
