export type TaskRecurrence =
  | null
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] };

/**
 * Canonical, normalized task shape used across the app.
 * - dueDate is YYYY-MM-DD
 * - assignedTo/sharedWith always exist
 * - completed/completedAt always exist
 */
export type Task = {
  id: string;

  title: string;
  /** Legacy alias used by some view models */
  text?: string;
  description?: string;

  /** Optional priority (legacy + future) */
  priority?: 'low' | 'med' | 'medium' | 'high' | number;

  /** YYYY-MM-DD (nullable for legacy data; normalized on load) */
  dueDate: string | null;

  createdAt: string;

  /** Last mutation time (ISO). Used for merge + sync. */
  updatedAt?: string;
  updatedBy?: string;

  completed: boolean;
  completedAt: string | null;

  /** Optional reminder time (HH:mm) */
  reminderTime: string | null;

  /** Legacy reminder alias (HH:mm or ISO) OR newer settings object */
  reminder?:
    | string
    | null
    | {
        enabled: boolean;
        minutesBefore?: number;
        time?: string | null;
      };

  /** Legacy due-time alias (HH:mm) */
  dueTime?: string | null;

  /** Who "owns" the task in the relationship context */
  assignedTo: string;

  /** People included on the task */
  sharedWith: string[];

  recurrence: TaskRecurrence;

  // Recurring instances
  _isInstance?: boolean;
  _parentId?: string;

  // ── View-layer augmentations (added by view model / service, not stored) ──
  /** SQLite row data attached by TasksService */
  _raw?: TaskRaw;
  /** Human-readable overdue string e.g. "2 days late" — computed by view model */
  overdueLabel?: string;
  /** Expo-notifications ID for the scheduled reminder */
  notificationId?: string | null;
};
export type TaskDraft = Partial<Omit<Task, 'id' | 'createdAt'>> & {
  id?: string;
  title?: string;
  dueDate?: string | null;
};

/** Raw storage record (SQLite/AsyncStorage shape). Populated by TasksService on load. */
export type TaskRaw = {
  assignedTo?: string;
  sharedWith?: string[];
  [key: string]: unknown;
};
