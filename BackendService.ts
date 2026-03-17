import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';

import type { CalendarEvent } from '../../../types/calendar';
import { getFirebaseAuth, getFirebaseDb } from '../firebaseClient';
import { initBackend } from '../BackendService';
import { logError } from '../../logger';
import { normalizeCalendarEvent } from '../../../viewModels/calendarEventVM';
import { getCurrentUserId } from '../../IdentityService';

// Debounced, best-effort sync of local calendar events to Firestore.
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingEvents: CalendarEvent[] | null = null;

function getUid(): string | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser?.uid ?? null;
}

function safeUpdatedAt(e: CalendarEvent): number {
  const v = e.updatedAt;
  const cr = e.createdAt;
  const ts = typeof v === 'string' ? Date.parse(v) : NaN;
  if (!Number.isNaN(ts)) return ts;
  const ts2 = typeof cr === 'string' ? Date.parse(cr) : NaN;
  if (!Number.isNaN(ts2)) return ts2;
  return 0;
}

function mergeByUpdatedAt(local: CalendarEvent[], remote: CalendarEvent[]): CalendarEvent[] {
  const map = new Map<string, CalendarEvent>();
  for (const e of local) map.set(e.id, e);
  for (const r of remote) {
    const existing = map.get(r.id);
    if (!existing) {
      map.set(r.id, r);
      continue;
    }
        map.set(r.id, safeUpdatedAt(r) >= safeUpdatedAt(existing) ? r : existing);
  }
  return Array.from(map.values());
}

/**
 * Pull remote events once and merge into local.
 * This is safe to call on boot; no-ops if Firebase isn't configured.
 */
export async function bootstrapCalendarFromFirestore(
  loadLocal: () => Promise<CalendarEvent[]>,
  saveLocal: (events: CalendarEvent[]) => Promise<void>
): Promise<void> {
  try {
    const init = await initBackend();
    if (!init.ok || !init.value.enabled) return;

    const uid = getUid();
    const db = getFirebaseDb();
    if (!uid || !db) return;

    const ref = collection(db, 'users', uid, 'events');
    const snap = await getDocs(ref);

    const currentUserId = getCurrentUserId();
    const remote: CalendarEvent[] = [];
    snap.forEach((d) => {
      const data = d.data();
      remote.push(normalizeCalendarEvent({ id: d.id, ...data }, currentUserId));
    });

    const local = await loadLocal();
    const merged = mergeByUpdatedAt(local, remote);

    // If merge changed anything, persist locally.
    if (merged.length !== local.length || JSON.stringify(merged.map((e) => [e.id, safeUpdatedAt(e)])).trim() !== JSON.stringify(local.map((e) => [e.id, safeUpdatedAt(e)])).trim()) {
      await saveLocal(merged);
    }

    // Push any missing/older remote docs (best-effort).
    queueCalendarSync(merged);
  } catch (e) {
    logError('CalendarFirestoreSync.bootstrap', e);
  }
}

async function flushSync(events: CalendarEvent[]): Promise<void> {
  const init = await initBackend();
  if (!init.ok || !init.value.enabled) return;

  const uid = getUid();
  const db = getFirebaseDb();
  if (!uid || !db) return;

  const batch = writeBatch(db);
  for (const e of events) {
    if (!e?.id) continue;
    const ref = doc(db, 'users', uid, 'events', e.id);
    batch.set(
      ref,
      {
        ...e,
        // Strip any undefined to keep docs tidy.
        updatedAt: safeUpdatedAt(e),
      },
      { merge: true }
    );
  }
  await batch.commit();
}

/** Queue a best-effort sync of the provided events to Firestore. */
export function queueCalendarSync(events: CalendarEvent[]): void {
  pendingEvents = events;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    const toSync = pendingEvents;
    pendingEvents = null;
    pendingTimer = null;
    if (!toSync) return;
    flushSync(toSync).catch((e) => logError('CalendarFirestoreSync.flush', e));
  }, 400);
}

/** Upsert a single event immediately (used by screens that need low-latency writes). */
export async function upsertCalendarEvent(event: CalendarEvent): Promise<void> {
  try {
    const init = await initBackend();
    if (!init.ok || !init.value.enabled) return;

    const uid = getUid();
    const db = getFirebaseDb();
    if (!uid || !db) return;

    const ref = doc(db, 'users', uid, 'events', event.id);
    await setDoc(ref, { ...event, updatedAt: safeUpdatedAt(event) }, { merge: true });
  } catch (e) {
    logError('CalendarFirestoreSync.upsert', e);
  }
}
