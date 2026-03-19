import { useEffect, useMemo, useState } from 'react';
import CalendarService from '../../../services/CalendarService';
import TasksService from '../../../services/TasksService';
import { todayKey, addDays, formatDayLabel, formatTime, parseEventDateTime, parseTaskDueDateTime, startOfToday } from '../../../utils/dateTime';
import { clamp } from '../../../utils/math';

import type { CalendarEvent, ParsedEvent } from '../../../types/calendar';
import type { Task } from '../../../types/tasks';
import { reportError } from '../../../utils/reportError';

export function useHomeData({ themeAccent }: { themeAccent: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const todayDateKey = useMemo(() => todayKey(), []);

  // Subscribe to CalendarService for events
  useEffect(() => {
    const loadEvents = async () => {
      try { const ev = await CalendarService.getEvents(); setEvents(Array.isArray(ev) ? ev : []); }
      catch (e) { reportError('Hook.HomeData', e); setEvents([]); }
    };
    loadEvents();
    return CalendarService.subscribe(loadEvents);
  }, []);

  // Subscribe to TasksService for tasks
  useEffect(() => {
    const loadTasks = async () => {
      try { setTasks(await TasksService.getTasks()); }
      catch (e) { reportError('Hook.HomeData', e); setTasks([]); }
    };
    loadTasks();
    return TasksService.subscribe(loadTasks);
  }, []);

  const computed = useMemo(() => {
    const now = new Date();
    const today0 = startOfToday();
    const weekEnd = addDays(today0, 7);

    const eventWithDT = (events || [])
      .map((e: CalendarEvent) => ({ ...e, _dt: parseEventDateTime(e) }))
      .filter((e): e is ParsedEvent => e._dt instanceof Date && !isNaN(e._dt.valueOf()))
      .sort((a, b) => a._dt.valueOf() - b._dt.valueOf());

    const upcomingEvents = eventWithDT.filter((e: ParsedEvent) => e._dt >= today0).slice(0, 6);
    const todaysEvents = eventWithDT.filter((e: ParsedEvent) => String(e.date) === todayDateKey);
    const nextEventToday = todaysEvents.find((e: ParsedEvent) => e._dt >= now) || todaysEvents[0] || null;

    const taskWithDT = (tasks || [])
      .map((t: Task) => ({ ...t, _dt: parseTaskDueDateTime(t) }))
      .filter((t): t is Task & { _dt: Date | null } => !t.completed);

    const dueTasks = taskWithDT
      .filter((t): t is Task & { _dt: Date } => t._dt instanceof Date && !isNaN(t._dt.valueOf()))
      .sort((a, b) => a._dt.valueOf() - b._dt.valueOf());
    const nextTask = dueTasks[0] || null;
    const overdueCount = dueTasks.filter((t: Task & { _dt: Date }) => t._dt < now).length;
    const eventsThisWeek = eventWithDT.filter((e: ParsedEvent) => e._dt >= today0 && e._dt < weekEnd).length;
    const completedTasks = (tasks || []).filter((t: Task) => t.completed).length;

    const markedDates = (() => {
      const marks: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
      for (const e of eventWithDT) {
        const key = String(e.date || '').slice(0, 10);
        if (!key) continue;
        marks[key] = { ...(marks[key] || {}), marked: true, dotColor: e.color || themeAccent };
      }
      if (selectedDate) marks[selectedDate] = { ...(marks[selectedDate] || {}), selected: true, selectedColor: themeAccent };
      return marks;
    })();

    const selectedDayEvents = eventWithDT.filter((e: CalendarEvent) => String(e.date) === String(selectedDate));

    return {
      upcomingEvents, nextEventToday, nextTask, overdueCount,
      eventsThisWeek, completedTasks, markedDates, selectedDayEvents,
      openTasksCount: clamp((tasks || []).filter((t: Task) => !t.completed).length, 0, 99),
      openTasks: (tasks || []).slice(0, 5),
      formatTime, formatDayLabel,
    };
  }, [events, tasks, todayDateKey, selectedDate, themeAccent]);

  return { events, tasks, selectedDate, setSelectedDate, todayDateKey, computed };
}