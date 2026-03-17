import { useCallback, useEffect, useMemo, useState } from 'react';
import TasksService from '../services/TasksService';
import type { Task } from '../types/tasks';
import { reportError } from '../utils/reportError';

/**
 * Reactive tasks hook.
 * Returns { tasks, active, completed, overdue, reload }.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(async () => {
    try {
      // Ensure recurring instances exist so screens see upcoming items.
      await TasksService.generateRecurringInstances();
      setTasks(await TasksService.getTasks());
    } catch (e) { reportError('Hook.Tasks', e instanceof Error ? e : new Error(String(e))); setTasks([]);
    }
  }, []);

  useEffect(() => {
    load();
    // Subscribe for mutation updates — just refetch, skip recurring generation
    const refetch = async () => {
      try { setTasks(await TasksService.getTasks()); }
      catch (e) { reportError('Hook.Tasks', e as Error); }
    };
    return TasksService.subscribe(refetch);
  }, [load]);

  const { active, completed, overdue } = useMemo(() => {
    const now = new Date();
    const isOverdue = (t: Task) => {
      if (t.completed) return false;
      const due = t.dueDate ? new Date(`${t.dueDate}T${t.dueTime || '23:59'}:00`) : null;
      return !!due && due < now;
    };
    const active = tasks.filter((t) => !t.completed);
    const completed = tasks.filter((t) => t.completed);
    const overdue = active.filter(isOverdue);
    return { active, completed, overdue };
  }, [tasks]);

  return { tasks, active, completed, overdue, reload: load };
}