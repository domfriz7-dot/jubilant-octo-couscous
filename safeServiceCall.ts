/**
 * Tiny observable helper for services.
 * Gives consistent subscribe/unsubscribe + safe notify.
 */

export type Listener<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => void;

export interface Observable<TArgs extends unknown[] = unknown[]> {
  subscribe: (listener: Listener<TArgs>) => () => void;
  notify: (...args: TArgs) => void;
  clear: () => void;
}

export function createObservable<TArgs extends unknown[] = unknown[]>(): Observable<TArgs> {
  const listeners = new Set<Listener<TArgs>>();

  const subscribe = (listener: Listener<TArgs>) => {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };

  const notify = (...args: TArgs) => {
    for (const fn of listeners) {
      try { fn(...args); } catch {
        // Swallow subscriber errors so one bad listener doesn't break others
      }
    }
  };

  const clear = () => { listeners.clear(); };

  return { subscribe, notify, clear };
}
