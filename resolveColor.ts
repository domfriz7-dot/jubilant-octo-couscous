/**
 * CalendarViewModel
 *
 * Resolves all copy decisions for CalendarScreen's day view.
 * The calendar grid rendering stays in the screen; this handles
 * the emotional layer on top of the data.
 *
 * Returns:
 *   dayHeader     { title, subtitle }
 *   emptyLabel    string
 *   taskLabel     string | null
 *   eventByline(event, users)  → { ownerLabel, sharingLabel }
 */

import { useMemo } from 'react';
import { getCurrentUserId } from '../services/IdentityService';
import { todayKey } from '../utils/dateTime';
import { emptyDay } from '../insights';
import type { CalendarEvent } from '../types/calendar';
import type { User } from '../types';
import type { Task } from '../types/tasks';
import { getFirstName } from '../utils/partners';

function fmtKey(d: Date): string { return todayKey(d); }

function fmtDayHeader(dateStr: string, todayKey: string): string {
  if (dateStr === todayKey) return 'Today';
  const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
  if (dateStr === fmtKey(tmr)) return 'Tomorrow';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function useCalendarViewModel({
  selectedDate,
  todayKey,
  dayEvents,
  dayTasks,
}: {
  selectedDate: string;
  todayKey: string;
  dayEvents: CalendarEvent[];
  dayTasks: Task[];
}) {
  return useMemo(() => {
    const isToday = selectedDate === todayKey;
    const evCount = dayEvents.length;
    const tkCount = dayTasks.length;

    // Day header
    let subtitle;
    if (evCount === 0 && tkCount === 0) subtitle = 'Wide open';
    else if (evCount > 0 && tkCount > 0) subtitle = `${evCount} moment${evCount > 1 ? 's' : ''} · ${tkCount} to handle`;
    else if (evCount > 0) subtitle = `${evCount} moment${evCount > 1 ? 's' : ''} planned`;
    else subtitle = `${tkCount} thing${tkCount > 1 ? 's' : ''} to handle`;

    // Empty day label — weekend-aware
    const dayOfWeek = new Date(selectedDate).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const emptyLabel = (evCount === 0 && tkCount === 0) ? emptyDay(isWeekend) : 'Nothing planned — the day is yours';

    return {
      dayHeader: {
        title: fmtDayHeader(selectedDate, todayKey),
        subtitle,
        isToday,
      },
      emptyLabel,
      taskLabel: tkCount > 0 ? 'TO HANDLE' : null,
    };
  }, [selectedDate, todayKey, dayEvents.length, dayTasks.length]);
}

/**
 * Pure function — can be called per-event without a hook.
 * Returns the byline text for an event card.
 */
export function eventByline(event: CalendarEvent, users: User[]) {
  const myId = getCurrentUserId();
  const isYours = !event.createdBy || event.createdBy === myId;
  const creator = users.find((u: { id: string }) => u.id === event.createdBy);
  const sharedUsers = users.filter((u: { id: string }) => event.sharedWith?.includes(u.id));

  const ownerLabel = isYours ? 'Yours' : `${getFirstName(creator?.name, 'Someone')}'s`;
  const sharingLabel = sharedUsers.length > 0
    ? `with ${sharedUsers.map((u: { name: string }) => getFirstName(u.name)).join(', ')}`
    : 'Just you';

  return { ownerLabel, sharingLabel, ownerIcon: isYours ? 'edit-3' : 'user' };
}
