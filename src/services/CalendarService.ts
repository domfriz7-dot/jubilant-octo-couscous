import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportError } from '../utils/reportError';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  endTime?: string;
  description?: string;
  color: string;
  createdBy: string;
  sharedWith: string[];
  location?: string;
  isAllDay?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  updatedAt?: string;
}

const EVENTS_KEY = '@uandme/events';
type Listener = (events: CalendarEvent[]) => void;

let _events: CalendarEvent[] = [];
const _listeners = new Set<Listener>();

function notify() {
  for (const l of _listeners) {
    try { l([..._events]); } catch (_) {}
  }
}

async function persist(): Promise<void> {
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(_events));
}

const CalendarService = {
  async load(): Promise<CalendarEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(EVENTS_KEY);
      _events = raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
    } catch (e) {
      reportError('CalendarService.load', e);
      _events = [];
    }
    return [..._events];
  },

  getEvents(): CalendarEvent[] {
    return [..._events];
  },

  getEventsForDate(date: string): CalendarEvent[] {
    return _events.filter((e) => e.date === date);
  },

  getUpcomingEvents(limit = 10): CalendarEvent[] {
    const today = new Date().toISOString().slice(0, 10);
    return _events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, limit);
  },

  async addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt'>): Promise<CalendarEvent> {
    const newEvent: CalendarEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    _events = [..._events, newEvent];
    await persist();
    notify();
    return newEvent;
  },

  async updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<void> {
    _events = _events.map((e) =>
      e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
    );
    await persist();
    notify();
  },

  async deleteEvent(id: string): Promise<void> {
    _events = _events.filter((e) => e.id !== id);
    await persist();
    notify();
  },

  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};

export default CalendarService;
