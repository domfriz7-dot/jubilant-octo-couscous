import { useEffect } from 'react';
import { initBackend } from '../../services/backend/BackendService';
import CalendarService from '../../services/CalendarService';
import TasksService from '../../services/TasksService';
import { bootstrapCalendarFromFirestore } from '../../services/backend/sync/CalendarFirestoreSync';
import { bootstrapTasksFromFirestore } from '../../services/backend/sync/TasksFirestoreSync';
import { pullSharedEvents, fetchRemoteConnections, subscribeToRemoteConnections } from '../../services/SharingService';
import ConnectionsService from '../../services/ConnectionsService';
import { logError } from '../../services/logger';
import { logEvent } from '../../services/Telemetry';

export default function useBootstrapBackend(): void {
  useEffect(() => {
    let unsubscribeConnections: (() => void) | null = null;
    // Non-blocking startup: if backend isn't configured, this is a no-op.
    initBackend().then(async (res) => {
      if (!res.ok) {
        logError('useBootstrapBackend.initBackend', (res as { error?: unknown }).error).catch(() => {});
        return;
      }

      if (res.value.enabled) logEvent('backend_ready', { provider: 'firebase' });

      if (!res.value.enabled) return;

      // 1. Sync own private events + tasks from Firestore
      bootstrapCalendarFromFirestore(
        () => CalendarService.getEvents(),
        (events) => CalendarService.saveEvents(events)
      ).catch(() => {});

      bootstrapTasksFromFirestore(
        () => TasksService.getTasks(),
        (tasks) => TasksService.saveTasks(tasks)
      ).catch(() => {});

      // 2. Pull shared events from other users (cross-platform sharing)
      try {
        const sharedEvents = await pullSharedEvents();
        if (sharedEvents.length > 0) {
          const localEvents = await CalendarService.getEvents();
          // Merge: remote shared events win if they're newer
          const merged = mergeByUpdatedAt(localEvents, sharedEvents);
          if (merged.length !== localEvents.length ||
              JSON.stringify(merged.map(e => [e.id, e.updatedAt])) !==
              JSON.stringify(localEvents.map(e => [e.id, e.updatedAt]))) {
            await CalendarService.saveEvents(merged);
          }
        }
      } catch (e) {
        logError('useBootstrapBackend.pullSharedEvents', e);
      }

      // 3. Sync connections from Firestore (picks up connections made on other device)
      try {
        const remoteConns = await fetchRemoteConnections();
        if (remoteConns.length > 0) {
          const localConns = await ConnectionsService.getConnections();
          const localIds = new Set(localConns.map((c) => c.id));
          let changed = false;
          const merged = [...localConns];
          for (const remote of remoteConns) {
            // Match by linkedVia code or connectedUid
            const exists = localConns.some(
              (c) =>
                c.linkedVia === remote.linkedVia ||
                c.id === remote.connectedUid ||
                c.id === remote.connectedLocalId
            );
            if (!exists) {
              merged.push({
                id: remote.connectedUid || remote.connectedLocalId,
                name: remote.displayName,
                email: '',
                color: remote.color,
                linkedVia: remote.linkedVia,
                createdAt: Date.now(),
              });
              changed = true;
            }
          }
          if (changed) await ConnectionsService.saveConnections(merged);
        }

        unsubscribeConnections = subscribeToRemoteConnections(async (liveConns) => {
          try {
            const localConns = await ConnectionsService.getConnections();
            const incoming = liveConns.map((remote) => ({
              id: remote.connectedUid || remote.connectedLocalId,
              remoteUid: remote.connectedUid || null,
              name: remote.displayName,
              email: '',
              color: remote.color,
              linkedVia: remote.linkedVia,
              createdAt: Date.now(),
              status: 'connected',
            }));
            const mergedLive = ConnectionsService.mergeConnections(localConns, incoming as unknown[]);
            await ConnectionsService.saveConnections(mergedLive);
          } catch (err) {
            logError('useBootstrapBackend.subscribeToRemoteConnections', err);
          }
        });
      } catch (e) {
        logError('useBootstrapBackend.fetchRemoteConnections', e);
      }
    });

    return () => {
      if (unsubscribeConnections) unsubscribeConnections();
    };
  }, []);
}

function mergeByUpdatedAt<T extends { id: string; updatedAt?: string; createdAt?: number | string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, any>();
  for (const e of local) map.set(e.id, e);
  for (const r of remote) {
    const existing = map.get(r.id);
    if (!existing) {
      map.set(r.id, r);
    } else {
      const rAt = r.updatedAt || r.createdAt || '';
      const eAt = existing.updatedAt || existing.createdAt || '';
      if (rAt >= eAt) map.set(r.id, r);
    }
  }
  return Array.from(map.values());
}
