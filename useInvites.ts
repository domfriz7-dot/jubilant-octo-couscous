/**
 * useSharedEvents — real-time hook for cross-platform calendar sharing.
 *
 * Subscribes to Firestore's /sharedEvents collection filtered to the current user.
 * When the other user (on Android or iOS) updates or cancels a shared event,
 * this hook fires and merges the changes into the local CalendarService store.
 *
 * Usage:
 *   // In CalendarScreen or any screen that shows shared events:
 *   useSharedEvents();  // fire and forget — merges into CalendarService automatically
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import CalendarService from '../services/CalendarService';
import { subscribeToSharedEvents } from '../services/SharingService';
import { logError, logEvent } from '../services/logger';
import type { CalendarEvent } from '../types/calendar';

function mergeByUpdatedAt(local: CalendarEvent[], remote: CalendarEvent[]): CalendarEvent[] {
  const map = new Map<string, CalendarEvent>();
  for (const e of local) map.set(e.id, e);
  for (const r of remote) {
    const existing = map.get(r.id);
    if (!existing) {
      map.set(r.id, r);
    } else {
      const rAt = String(r.updatedAt || r.createdAt || '');
      const eAt = String(existing.updatedAt || existing.createdAt || '');
      if (rAt >= eAt) map.set(r.id, r);
    }
  }
  return Array.from(map.values());
}

export default function useSharedEvents(): void {
  const unsubRef = useRef<(() => void) | null>(null);
  const appStateSub = useRef<any>(null);

  const startListening = () => {
    if (unsubRef.current) return; // already listening

    unsubRef.current = subscribeToSharedEvents(
      async (sharedEvents: CalendarEvent[]) => {
        if (!sharedEvents.length) return;
        try {
          // Filter out soft-deleted events
          const live = sharedEvents.filter((e: { deleted?: boolean }) => !e.deleted);
          const deleted = sharedEvents.filter((e: { deleted?: boolean; id: string }) => e.deleted).map((e) => e.id);

          const localEvents = await CalendarService.getEvents();

          // Remove soft-deleted events
          let merged = localEvents.filter((e) => !deleted.includes(e.id));

          // Merge live shared events
          merged = mergeByUpdatedAt(merged, live);

          // Only save if something changed
          const localSorted = localEvents.map(e => [e.id, e.updatedAt]).sort().join('');
          const mergedSorted = merged.map(e => [e.id, e.updatedAt]).sort().join('');
          if (localSorted !== mergedSorted) {
            await CalendarService.saveEvents(merged);
            logEvent('useSharedEvents.merged', { added: live.length, removed: deleted.length });
          }
        } catch (e) {
          logError('useSharedEvents.onUpdate', e);
        }
      },
      (err) => {
        logError('useSharedEvents.subscription', err);
      }
    );
  };

  const stopListening = () => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
  };

  useEffect(() => {
    startListening();

    // Pause listener when app backgrounds, resume when foregrounded
    // This avoids wasted Firestore reads and battery drain in background
    appStateSub.current = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startListening();
      } else if (state === 'background') {
        stopListening();
      }
    });

    return () => {
      stopListening();
      if (appStateSub.current?.remove) appStateSub.current.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
