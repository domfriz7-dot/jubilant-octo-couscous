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
let _sharedEvents: CalendarEvent[] = [];
const _listeners = new Set<Listener>();

function merged(): CalendarEvent[] {
  const seen = new Set<string>();
  const result: CalendarEvent[] = [];
  for (const e of [..._events, ..._sharedEvents]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      result.push(e);
    }
  }
  return result;
}

function notify() {
  const all = merged();
  for (const l of _listeners) {
    try { l(all); } catch (_) {}
  }
}

async function persist(): Promise<void> {
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(_events));
}

function isFirebaseConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
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
    return merged();
  },

  getEvents(): CalendarEvent[] {
    return merged();
  },

  getEventsForDate(date: string): CalendarEvent[] {
    return merged().filter((e) => e.date === date);
  },

  getUpcomingEvents(limit = 10): CalendarEvent[] {
    const today = new Date().toISOString().slice(0, 10);
    return merged()
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

    // Write to Firestore so connected users receive the event via onEventShared trigger
    if (newEvent.sharedWith.length > 0 && isFirebaseConfigured()) {
      try {
        const { getFirestore, doc, setDoc } = await import('firebase/firestore');
        const db = getFirestore();
        await setDoc(doc(db, 'events', newEvent.id), {
          ...newEvent,
          ownerId: newEvent.createdBy, // field expected by the onEventShared Cloud Function
        });
      } catch (e) {
        reportError('CalendarService.addEvent.firestore', e);
      }
    }

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

  /**
   * Subscribe to events shared with uid from Firestore.
   * Merges received events into the local state so calendar screens update
   * automatically when a connection shares an event.
   * Returns an unsubscribe function.
   */
  subscribeToSharedEvents(uid: string): () => void {
    if (!isFirebaseConfigured()) return () => {};

    let unsub: () => void = () => {};

    (async () => {
      try {
        const {
          getFirestore,
          collection,
          query,
          where,
          onSnapshot,
        } = await import('firebase/firestore');
        const db = getFirestore();

        unsub = onSnapshot(
          query(collection(db, 'events'), where('sharedWith', 'array-contains', uid)),
          (snap) => {
            const remote = snap.docs.map((d) => ({ ...d.data() } as CalendarEvent));
            // Exclude events we created ourselves (already tracked in _events)
            const localIds = new Set(_events.map((e) => e.id));
            _sharedEvents = remote.filter((e) => !localIds.has(e.id));
            notify();
          },
          (err) => reportError('CalendarService.subscribeToSharedEvents', err)
        );
      } catch (e) {
        reportError('CalendarService.subscribeToSharedEvents.init', e);
      }
    })();

    return () => unsub();
  },

  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};

export default CalendarService;
