import { getCurrentUserId } from '../services/IdentityService';
import { useMemo } from 'react';
import { tokens } from '../config/tokens';
import { noTasks, overdueReframe } from '../insights';
import type { Task } from '../types/tasks';
import type { User } from '../types';
import { todayKey } from '../utils/dateTime';
import { getFirstName } from '../utils/partners';

const PRI_META: Record<string, { label: string; color: string }> = {
  high: { label: 'HIGH', color: tokens.priority.high },
  med: { label: 'MED', color: tokens.priority.med },
  low: { label: 'LOW', color: tokens.priority.low },
};

function fmtKey(d: Date): string {
  return todayKey(d);
}

function isOverdue(t: Task): boolean {
  return !t.completed && !!t.dueDate && new Date(`${t.dueDate}T${t.dueTime || '23:59'}`) < new Date();
}

function daysFromNow(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function relativeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const diff = daysFromNow(dateStr);
  if (diff === -1) return 'Yesterday';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff <= 6) return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' });
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function sectionLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No date';
  const diff = daysFromNow(dateStr);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export type TaskCardVM = {
  id: string;
  text: string;
  completed: boolean;
  priority: string;
  priorityColor: string | null;
  priorityLabel: string | null;
  isOverdue: boolean;
  overdueLabel: string | null;
  dateLabel: string | null;
  timeLabel: string | null;
  dueDate: string | null;
  hasReminder: boolean;
  isRecurring: boolean;
  shared:
    | { type: 'assigned'; name: string; color: string | null; avatar: { name: string; color: string | null } }
    | { type: 'together'; name: string; color: string | null; avatar: null }
    | null;
  borderColor: string | null;
  a11yLabel: string;
  _raw: Task;
};

function buildCardVM(item: Task, others: User[]): TaskCardVM {
  const text = item.text || item.title || '';
  const priKey = (typeof item.priority === 'string'
    ? (item.priority === 'medium' ? 'med' : item.priority)
    : 'med') as 'high' | 'med' | 'low';
  const pri = PRI_META[priKey] || PRI_META.med;
  const over = isOverdue(item);
  const assignedUser = item.assignedTo && item.assignedTo !== getCurrentUserId()
    ? others.find((u: { id: string }) => u.id === item.assignedTo)
    : null;
  const isShared = (item.sharedWith?.length || 0) > 0 || !!assignedUser;

  let shared: TaskCardVM['shared'] = null;
  if (assignedUser) {
    const au = (typeof assignedUser === 'object' && assignedUser !== null
      ? (assignedUser as unknown as Record<string, unknown>)
      : {});
    const auName = typeof au.name === 'string' ? au.name : '';
    const auColor = typeof au.color === 'string' ? au.color : null;
    shared = {
      type: 'assigned',
      name: `${getFirstName(String(auName), 'Someone')} is on this`,
      color: auColor,
      avatar: { name: auName, color: auColor },
    };
  } else if (isShared) {
    shared = { type: 'together', name: 'Together', color: null, avatar: null };
  }

  const parts: string[] = [text];
  if (over) parts.push('overdue');
  if (item.completed) parts.push('done');
  if (pri) parts.push(`${item.priority} priority`);

  return {
    id: item.id,
    text,
    completed: !!item.completed,
    priority: priKey,
    priorityColor: pri?.color || null,
    priorityLabel: pri?.label || null,
    isOverdue: over,
    overdueLabel: over ? 'Overdue' : null,
    dateLabel: relativeDate(item.dueDate),
    timeLabel: item.dueTime || null,
    dueDate: item.dueDate || null,
    hasReminder:
      typeof item.reminder === 'string'
        ? !!item.reminder
        : typeof item.reminder === 'object' && item.reminder !== null
          ? (() => {
              const r = item.reminder as Record<string, unknown>;
              return r.enabled === true;
            })()
          : !!item.reminderTime,
    isRecurring: (() => {
      if (item.recurrence) return true;
      const obj = item as unknown as Record<string, unknown>;
      return typeof obj._parentId === 'string' && obj._parentId.length > 0;
    })(),
    shared,
    borderColor: over
      ? tokens.priority.high
      : (() => {
          if (!assignedUser) return pri?.color || null;
          const au = assignedUser as unknown as Record<string, unknown>;
          return typeof au.color === 'string' ? au.color : (pri?.color || null);
        })(),
    a11yLabel: parts.join(', '),
    _raw: item,
  };
}

export function useTasksViewModel(args: {
  active: Task[];
  completed: Task[];
  overdue: Task[];
  view: 'focus' | 'all' | string;
  others: User[];
}): {
  header: { title: string; subtitle: string; insight: string | null };
  toggles: Array<{ key: string; icon: string; label: string; active: boolean }>;
  emptyState: { icon: string; text: string };
  displayTasks: TaskCardVM[];
  sections: Array<{ title: string; icon: string; color: string; data: TaskCardVM[] }>;
  footer: { text: string } | null;
} {
  const { active, completed, overdue, view, others } = args;

  return useMemo(() => {
    const priSort: Record<string, number> = { high: 0, med: 1, low: 2 };

    const headerInsight = overdue.length > 0 ? overdueReframe(overdue.length) : null;
    const header = {
      title: 'To Do',
      subtitle: `${active.length} on your plate${overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}`,
      insight: headerInsight,
    };

    const toggles = [
      { key: 'focus', icon: 'calendar', label: 'Coming up', active: view === 'focus' },
      { key: 'all', icon: 'list', label: 'Everything', active: view === 'all' },
    ];

    const emptyState = {
      icon: view === 'focus' ? 'sun' : 'check-circle',
      text: view === 'focus' ? 'Nothing coming up this week — enjoy it' : (noTasks() || "Nothing here yet — that's OK"),
    };

    let displayTasks: TaskCardVM[] = [];
    let sections: Array<{ title: string; icon: string; color: string; data: TaskCardVM[] }> = [];

    if (view === 'focus') {
      const sevenOut = new Date();
      sevenOut.setDate(sevenOut.getDate() + 7);
      const cutoff = fmtKey(sevenOut);

      const upcoming = active.filter((t: Task) => {
        if (isOverdue(t)) return true;
        if (!t.dueDate) return true;
        return t.dueDate <= cutoff;
      });

      const sorted = [...upcoming].sort((a, b) => {
        if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
        if (a.dueDate !== b.dueDate) return (a.dueDate || 'zzzz').localeCompare(b.dueDate || 'zzzz');
        return (priSort[a.priority || 'med'] ?? 1) - (priSort[b.priority || 'med'] ?? 1);
      });

      displayTasks = sorted.map((t: Task) => buildCardVM(t, others));

      const sectionMap = new Map<string, TaskCardVM[]>();
      for (const card of displayTasks) {
        const key = card.isOverdue ? 'Overdue' : sectionLabel(card.dueDate);
        if (!sectionMap.has(key)) sectionMap.set(key, []);
        sectionMap.get(key)!.push(card);
      }

      sections = Array.from(sectionMap.entries()).map(([title, data]) => ({
        title,
        icon: title === 'Overdue' ? 'alert-circle' : title === 'Today' ? 'sun' : 'calendar',
        color: title === 'Overdue' ? tokens.priority.high : title === 'Today' ? tokens.priority.med : tokens.palette.sage,
        data,
      }));
    } else {
      const sorted = [
        ...[...active].sort((a, b) => {
          if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
          return (priSort[a.priority || 'med'] ?? 1) - (priSort[b.priority || 'med'] ?? 1);
        }),
        ...completed.slice(0, 10),
      ];

      displayTasks = sorted.map((t: Task) => buildCardVM(t, others));
      sections = [{ title: 'All tasks', icon: 'list', color: tokens.palette.driftwood, data: displayTasks }];
    }

    const footer = view === 'all' && completed.length > 0 ? { text: `Tidy up — clear ${completed.length} finished` } : null;

    return { header, toggles, emptyState, displayTasks, sections, footer };
  }, [active, completed, overdue, view, others]);
}