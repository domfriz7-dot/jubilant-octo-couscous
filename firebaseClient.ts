import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';

import type { Task } from '../../../types';
import { normalizeTask } from '../../../viewModels/taskVM';
import { getCurrentUserId } from '../../IdentityService';
import { logError } from '../../logger';
import { initBackend } from '../BackendService';
import { getFirebaseAuth, getFirebaseDb } from '../firebaseClient';

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTasks: Task[] | null = null;

function getUid(): string | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser?.uid ?? null;
}

function safeUpdatedAt(t: Task): number {
  const v = t.updatedAt;
  const cr = t.createdAt;
  const ts = typeof v === 'string' ? Date.parse(v) : NaN;
  if (!Number.isNaN(ts)) return ts;
  const ts2 = typeof cr === 'string' ? Date.parse(cr) : NaN;
  if (!Number.isNaN(ts2)) return ts2;
  return 0;
}

function mergeByUpdatedAt(local: Task[], remote: Task[]): Task[] {
  const map = new Map<string, Task>();
  for (const t of local) map.set(t.id, t);
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

export async function bootstrapTasksFromFirestore(
  loadLocal: () => Promise<Task[]>,
  saveLocal: (tasks: Task[]) => Promise<void>
): Promise<void> {
  try {
    const init = await initBackend();
    if (!init.ok || !init.value.enabled) return;

    const uid = getUid();
    const db = getFirebaseDb();
    if (!uid || !db) return;

    const ref = collection(db, 'users', uid, 'tasks');
    const snap = await getDocs(ref);

    const currentUserId = getCurrentUserId();
    const remote: Task[] = [];
    snap.forEach((d) => {
      remote.push(normalizeTask({ id: d.id, ...d.data() }, currentUserId));
    });

    const local = await loadLocal();
    const merged = mergeByUpdatedAt(local, remote);

    if (merged.length !== local.length) {
      await saveLocal(merged);
    }

    queueTasksSync(merged);
  } catch (e) {
    logError('TasksFirestoreSync.bootstrap', e);
  }
}

async function flushSync(tasks: Task[]): Promise<void> {
  const init = await initBackend();
  if (!init.ok || !init.value.enabled) return;

  const uid = getUid();
  const db = getFirebaseDb();
  if (!uid || !db) return;

  const batch = writeBatch(db);
  for (const t of tasks) {
    if (!t?.id) continue;
    const ref = doc(db, 'users', uid, 'tasks', t.id);
    batch.set(
      ref,
      {
        ...t,
        updatedAt: safeUpdatedAt(t),
      },
      { merge: true }
    );
  }
  await batch.commit();
}

export function queueTasksSync(tasks: Task[]): void {
  pendingTasks = tasks;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    const toSync = pendingTasks;
    pendingTasks = null;
    pendingTimer = null;
    if (!toSync) return;
    flushSync(toSync).catch((e) => logError('TasksFirestoreSync.flush', e));
  }, 400);
}
