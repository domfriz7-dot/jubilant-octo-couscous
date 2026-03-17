import { todayKey } from '../utils/dateTime';
import type { Task, TaskDraft, TaskRecurrence } from '../types';

import { getCurrentUserId } from '../services/IdentityService';

function isoDateToday(): string {
  return todayKey();
}

export function normalizeTask(raw: Record<string, unknown>, currentUserId?: string): Task {
  const resolvedId = currentUserId ?? getCurrentUserId();
  const nowIso = new Date().toISOString();

  const id: string = String(raw?.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`);

  const title: string = String(raw?.title ?? raw?.name ?? '').trim() || 'Untitled task';

  const dueDate: string =
    typeof raw?.dueDate === 'string' && raw.dueDate.length >= 10
      ? raw.dueDate.slice(0, 10)
      : isoDateToday();

  const assignedTo: string = String(raw?.assignedTo ?? resolvedId);

  const sharedWith: string[] = Array.isArray(raw?.sharedWith)
    ? raw.sharedWith.map((x: unknown) => String(x)).filter(Boolean)
    : [];

  const completed: boolean = Boolean(raw?.completed);

  const completedAt: string | null =
    raw?.completedAt == null ? null : String(raw.completedAt);

  const reminderTime: string | null =
    raw?.reminderTime == null ? null : String(raw.reminderTime);

  const recurrence: TaskRecurrence =
    raw?.recurrence == null ? null : (raw.recurrence as TaskRecurrence);

  const createdAt: string =
    raw?.createdAt ? String(raw.createdAt) : nowIso;

  const updatedAt: string =
    raw?.updatedAt ? String(raw.updatedAt) : createdAt;

  const updatedBy: string | undefined =
    raw?.updatedBy ? String(raw.updatedBy) : undefined;

  return {
    id,
    title,
    description: raw?.description ? String(raw.description) : undefined,
    dueDate,
    createdAt,
    updatedAt,
    updatedBy,
    completed,
    completedAt: completed ? completedAt ?? nowIso : null,
    reminderTime,
    assignedTo,
    sharedWith,
    recurrence,
    _isInstance: Boolean(raw?._isInstance),
    _parentId: raw?._parentId ? String(raw._parentId) : undefined,
  };
}

export function normalizeTasks(list: unknown[], currentUserId?: string): Task[] {
  if (!Array.isArray(list)) return [];
  return list.map((t: Record<string, unknown>) => normalizeTask(t, currentUserId));
}

export function toTaskDraft(task: Task): TaskDraft {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ?? undefined,
    reminderTime: task.reminderTime,
    assignedTo: task.assignedTo,
    sharedWith: task.sharedWith,
    recurrence: task.recurrence,
    completed: task.completed,
    completedAt: task.completedAt,
  };
}

export function formatTaskDueLabel(task: Task): string {
  // Keep simple for now. Can evolve to "Today/Tomorrow" etc later.
  return task.dueDate || '';
}
