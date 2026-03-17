import { todayKey } from '../utils/dateTime';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readJsonWithSchema } from '../utils/storage';
import { zTasksArray } from '../config/storageSchemas';
import { logError } from '../services/logger';
import { createObservable } from '../utils/observable';
import { normalizeTask, normalizeTasks } from '../viewModels/taskVM';
import type { Task, TaskRecurrence } from '../types';
import { getCurrentUserId } from './IdentityService';

/**
 * TasksService — centralized task storage with pub/sub.
 *
 * Replaces scattered AsyncStorage.getItem('@uandme_tasks') calls.
 * All consumers subscribe and get notified on every mutation.
 *
 * ⚡ BACKEND: swap AsyncStorage calls with API, keep interface identical.
 */

const KEY = '@uandme_tasks';

type TasksListener = (tasks: Task[]) => void;

class TasksService {
  private _obs = createObservable<[Task[]]>();
  private _cache: Task[] | null = null;

  async getTasks(): Promise<Task[]> {
    // ⚡ BACKEND: return fetch('/api/tasks').then((r: Response) => r.json())
    const rawTasks = await readJsonWithSchema(KEY, zTasksArray, this._defaultTasks() as unknown[], 'tasks');
    const normalized = Array.isArray(rawTasks) ? normalizeTasks(rawTasks, getCurrentUserId()) : this._defaultTasks();
    this._cache = normalized;
    return normalized;
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    // ⚡ BACKEND: return fetch('/api/tasks', { method: 'PUT', body: JSON.stringify(tasks) })
    const uid = getCurrentUserId();
    const now = new Date().toISOString();
    const normalized = normalizeTasks(tasks as unknown[], uid).map((t) => ({
      ...t,
      updatedAt: t.updatedAt || now,
      updatedBy: t.updatedBy || uid,
    }));
    this._cache = normalized;
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(normalized));
    } catch (e) {
      logError('TasksService', e);
    }
    this._notify();

    // Best-effort backend sync (non-blocking)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { queueTasksSync } = require('./backend/sync/TasksFirestoreSync');
    queueTasksSync(normalized);
  }

  async addTask(task: Partial<Task>): Promise<Task> {
    const tasks = await this.getTasks();
    const draft = {
      ...task,
      // Date.now() alone can duplicate when multiple tasks are created in quick succession.
      // Add entropy to guarantee unique keys.
      id: task.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      dueDate: task.dueDate || todayKey(),
      createdAt: task.createdAt || new Date().toISOString(),
      assignedTo: task.assignedTo || getCurrentUserId(),
      sharedWith: task.sharedWith || [],
      recurrence: (task.recurrence as TaskRecurrence) || null,
    };
    const newTask = normalizeTask(draft);
    await this.saveTasks([newTask, ...tasks]);
    return newTask;
  }

  /**
   * Generate upcoming instances for recurring tasks.
   * Call this on app load / when viewing tasks.
   * Creates concrete task instances for the next 14 days.
   */
  async generateRecurringInstances(): Promise<void> {
    const tasks = await this.getTasks();
    const recurring = tasks.filter((t) => t.recurrence && !t._isInstance);
    if (recurring.length === 0) return;

    const today = new Date();
    const existingInstances = new Set(
      tasks.filter((t) => t._parentId).map((t) => `${t._parentId}_${t.dueDate}`),
    );

    const newInstances: Task[] = [];
    for (const parent of recurring) {
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...6=Sat
        const dueDate = todayKey(d);

        if (parent.recurrence?.type === 'daily') {
          // ok
        } else if (parent.recurrence?.type === 'weekly') {
          const days = Array.isArray(parent.recurrence.days) ? parent.recurrence.days : [];
          if (!days.includes(dayOfWeek)) continue;
        } else {
          continue;
        }

        const key = `${parent.id}_${dueDate}`;
        if (existingInstances.has(key)) continue;

        newInstances.push({
          ...parent,
          id: `${parent.id}_${dueDate}`,
          dueDate,
          completed: false,
          completedAt: null,
          _isInstance: true,
          _parentId: parent.id,
        });
      }
    }

    if (newInstances.length === 0) return;
    await this.saveTasks([...newInstances, ...tasks]);
  }

  async toggleTask(taskId: string): Promise<Task | null> {
    const tasks = await this.getTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;
    const t = tasks[idx];
    const nextCompleted = !t.completed;
    const next: Task = {
      ...t,
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
      updatedBy: getCurrentUserId(),
    };
    tasks[idx] = next;
    await this.saveTasks(tasks);
    return next;
  }

  /**
   * Toggle a task and run all side effects (XP, accountability, notification cleanup).
   *
   * This is the method screens should call. It replaces the pattern where
   * TasksScreen was orchestrating XPService, AccountabilityService, and
   * NotificationService directly after toggling.
   *
   * Returns { task, wasCompleted } so the caller can decide on haptics/UI.
   */
  async toggleTaskWithEffects(taskId: string): Promise<{ task: Task | null; wasCompleted: boolean }> {
    const tasks = await this.getTasks();
    const existing = tasks.find((t) => t.id === taskId);
    const wasOpen = existing && !existing.completed;

    const task = await this.toggleTask(taskId);

    if (wasOpen && task) {
      // Side effects are lazy-loaded to keep the import graph clean.
      // Each is fire-and-forget with its own error handling.
      try {
        const XPService = require('./XPService').default;
        await XPService.completeTask();
      } catch (e) { logError('TasksService.effects.xp', e); }

      if (existing.notificationId) {
        try {
          const NotificationService = require('./NotificationService').default;
          await NotificationService.cancelNotification(existing.notificationId);
        } catch (e) { logError('TasksService.effects.notification', e); }
      }

      const myId = getCurrentUserId();
      const connectionIds = [...new Set(
        [...(existing.sharedWith || []), existing.assignedTo]
          .filter(Boolean)
          .filter((x: string) => x !== myId),
      )];
      if (connectionIds.length > 0) {
        try {
          const AccountabilityService = require('./AccountabilityService').default;
          for (const cid of connectionIds) {
            await AccountabilityService.updateStreak(cid);
          }
        } catch (e) { logError('TasksService.effects.accountability', e); }
      }
    }

    return { task, wasCompleted: !!wasOpen };
  }

  /**
   * Delete a task, cancelling its notification if one exists.
   *
   * Returns true if the task was found and deleted.
   */
  async deleteTaskWithCleanup(taskId: string): Promise<boolean> {
    const tasks = await this.getTasks();
    const task = tasks.find((t) => t.id === taskId);

    if (task?.notificationId) {
      try {
        const NotificationService = require('./NotificationService').default;
        await NotificationService.cancelNotification(task.notificationId);
      } catch (e) { logError('TasksService.effects.notification', e); }
    }

    return this.deleteTask(taskId);
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const tasks = await this.getTasks();
    const next = tasks.filter((t) => t.id !== taskId);
    if (next.length === tasks.length) return false;
    await this.saveTasks(next);
    return true;
  }

  async clearAll(): Promise<void> {
    await this.saveTasks([]);
  }

  async clearCompleted(): Promise<void> {
    const tasks = await this.getTasks();
    const remaining = tasks.filter((t) => !t.completed);
    await this.saveTasks(remaining);
  }

  subscribe(listener: TasksListener): () => void {
    const unsub = this._obs.subscribe((tasks: Task[]) => listener(tasks));
    // Send current state immediately
    this.getTasks().then((tasks: Task[]) => listener(tasks)).catch(() => {});
    return unsub;
  }

  private _notify(): void {
    if (!this._cache) return;
    this._obs.notify(this._cache);
  }

  private _defaultTasks(): Task[] {
    // Keep defaults minimal; onboarding seed handled elsewhere.
    return [];
  }
}

export default new TasksService();
