import { getCurrentUserId } from '../services/IdentityService';
import { useMemo } from 'react';
import { overdueReframe, streakInsight } from '../insights';
import type { Task } from '../types/tasks';
import type { User } from '../types';
import type { AccountabilitySnapshot } from '../types/shared';
import type { CalendarEvent, ParsedEvent } from '../types/calendar';
import { getFirstName } from '../utils/partners';

// Minimal shapes used by the Home VM. Keep these narrow and strict.
export type HomeComputedEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  sharedWith?: string[];
  _dt: Date;
  createdBy?: string;
};

export type HomeComputed = {
  upcomingEvents: HomeComputedEvent[];
  openTasksCount: number;
  overdueCount: number;
  nextEventToday: HomeComputedEvent | null;
  openTasks: Task[];
  formatTime: (d: Date) => string;
  formatDayLabel: (d: Date) => string;
};

export interface AccountSnapshot {
  snapshots: AccountabilitySnapshot[];
  totalMy: number;
  totalTheir: number;
  totalMissed: number;
  bestStreak: number;
  mostImbalanced: AccountabilitySnapshot | null;
}

const GREETINGS_MORNING = [
  'Good morning', 'Buenos días', 'Bonjour', 'Guten Morgen', 'Buongiorno',
  'Bom dia', 'おはよう', 'Kalimera', 'Selamat pagi', 'Magandang umaga',
  'God morgon', 'Dobré ráno', 'Dzień dobry', 'Suprabhat', 'Sabah el kheir',
  "G'day", 'Top of the morning', 'Rise and shine',
];
const GREETINGS_AFTERNOON = [
  'Good afternoon', 'Buenas tardes', 'Bon après-midi', 'Guten Tag', 'Buon pomeriggio',
  'Boa tarde', 'こんにちは', 'Kalispera', 'Selamat siang', 'God eftermiddag',
  'Hey there', 'Hope your day is good',
];
const GREETINGS_EVENING = [
  'Good evening', 'Buenas noches', 'Bonsoir', 'Guten Abend', 'Buona sera',
  'Boa noite', 'こんばんは', 'God kväll', 'Selamat malam', 'Dobry wieczór',
  'Hey, wind down time', 'Evening',
];

function pickGreeting(h: number): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const pool = h < 12 ? GREETINGS_MORNING : h < 17 ? GREETINGS_AFTERNOON : GREETINGS_EVENING;
  return pool[dayOfYear % pool.length];
}

function interpretDay(args: {
  eventsToday: number;
  openTasks: number;
  overdueCount: number;
  nextEvent: HomeComputedEvent | null;
  acct: AccountSnapshot | null;
}): { icon: string; colorKey: string; headline: string; sub: string } {
  const { eventsToday, openTasks, overdueCount, nextEvent, acct } = args;

  if (overdueCount >= 3)
    return { icon: 'alert-circle', colorKey: 'error', headline: `${overdueCount} things need you`, sub: 'Pick the easiest — momentum builds' };
  if (overdueCount > 0 && acct?.totalMissed > 0)
    return { icon: 'alert-triangle', colorKey: 'warning', headline: 'You and yours are slipping', sub: `${overdueCount} on you, ${acct.totalMissed} between you both` };
  if (overdueCount > 0)
    return { icon: 'clock', colorKey: 'warning', headline: `${overdueCount} still waiting on you`, sub: 'One down changes the feeling' };
  if (eventsToday >= 3 && openTasks >= 3)
    return { icon: 'zap', colorKey: 'error', headline: 'Full day together', sub: `${eventsToday} moments planned, ${openTasks} things to handle` };
  if (eventsToday >= 2)
    return { icon: 'calendar', colorKey: 'info', headline: `${eventsToday} moments today`, sub: nextEvent ? `Up first: ${nextEvent.title}` : '' };
  if (acct?.bestStreak >= 5)
    return { icon: 'trending-up', colorKey: 'success', headline: `${acct.bestStreak} days in rhythm`, sub: "You're showing up for each other" };
  if (nextEvent && eventsToday === 1)
    return { icon: 'arrow-right', colorKey: 'info', headline: nextEvent.title, sub: `At ${String(nextEvent.time || '')} — rest of the day is yours` };
  if (openTasks > 0)
    return { icon: 'check-circle', colorKey: 'success', headline: `${openTasks} thing${openTasks > 1 ? 's' : ''} on your mind`, sub: 'Quiet day — good time to clear them' };
  return { icon: 'sun', colorKey: 'muted', headline: "You're both free", sub: 'Good day to plan something together' };
}

function acctTag(snap: AccountabilitySnapshot | null): { text: string; bold: boolean; colorKey: string } | null {
  if (snap?.missedByMe?.length > 0) return { text: `you owe them ${snap.missedByMe.length}`, bold: true, colorKey: 'gentle' };
  if (snap?.missedByThem?.length > 0) return { text: 'waiting on them', bold: true, colorKey: 'info' };
  if (typeof snap?.balance === 'number' && snap.balance < 35) return { text: "they're carrying you", bold: true, colorKey: 'gentle' };
  if (typeof snap?.balance === 'number' && snap.balance > 65) return { text: "you're carrying them", bold: true, colorKey: 'info' };
  if (snap?.myCompletions > 0 && snap?.theirCompletions > 0) return { text: 'in rhythm', bold: false, colorKey: 'muted' };
  return null;
}

function nudgeColorKey(type: string): string {
  const map: Record<string, string> = { warning: 'warning', gentle: 'error', celebration: 'streak', positive: 'success', info: 'accent' };
  return map[type] || 'muted';
}

export function useHomeViewModel(args: {
  computed: HomeComputed;
  todayDateKey: string;
  users: User[];
  others: User[];
  acct: AccountSnapshot;
}) {
  const { computed, todayDateKey, users, others, acct } = args;

  return useMemo(() => {
    const h = new Date().getHours();
    const greeting = {
      date: new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
      line: pickGreeting(h),
    };

    const todayEvents = computed.upcomingEvents.filter((e: HomeComputedEvent) => String(e.date) === todayDateKey);
    const hero = interpretDay({
      eventsToday: todayEvents.length,
      openTasks: computed.openTasksCount,
      overdueCount: computed.overdueCount,
      nextEvent: computed.nextEventToday,
      acct,
    });

    const heroInsight = (() => {
      if (computed.overdueCount > 0) return overdueReframe(computed.overdueCount);
      if (acct?.bestStreak >= 3 && others.length > 0) {
        const topPerson = getFirstName(others[0]?.name, 'them');
        return streakInsight(acct.bestStreak, topPerson);
      }
      return null;
    })();

    const ne = computed.nextEventToday;
    const nextUp = ne
      ? {
          title: ne.title,
          time: computed.formatTime(ne._dt),
          description: ne.description || null,
          color: ne.color,
          sharedAvatars: users.filter((u) => ne.sharedWith?.includes(u.id)).slice(0, 3),
          event: ne,
        }
      : null;

    const people = acct && acct.snapshots?.length > 0
      ? {
          label: "HOW YOU'RE DOING",
          rows: (Array.isArray(acct.snapshots) ? acct.snapshots : [])
            .map((snap) => {
              const user = others.find((u) => u.id === snap.connectionId);
              if (!user) return null;
              const tag = acctTag(snap);
              return {
                id: snap.connectionId,
                name: getFirstName(user.name),
                avatar: {
                  name: user.name,
                  color: (typeof user === 'object' && user !== null ? (user as unknown as Record<string, unknown>).color : undefined),
                },
                barWidth: snap.balance,
                tag: tag?.text || null,
                tagColorKey: tag?.colorKey || 'muted',
                tagBold: tag?.bold || false,
                user,
              };
            })
            .filter(Boolean),
          nudge:
            acct.mostImbalanced?.nudge && acct.mostImbalanced.nudge.type !== 'neutral'
              ? { text: acct.mostImbalanced.nudge.text, colorKey: nudgeColorKey(acct.mostImbalanced.nudge.type) }
              : null,
        }
      : null;

    const moments = computed.upcomingEvents.length > 0
      ? {
          label: 'MOMENTS AHEAD',
          linkText: 'Calendar',
          rows: computed.upcomingEvents.slice(0, 3).map((e: HomeComputedEvent) => {
            const isToday = String(e.date) === todayDateKey;
            return {
              id: e.id,
              title: e.title,
              when: isToday ? computed.formatTime(e._dt) : `${computed.formatDayLabel(e._dt)} · ${computed.formatTime(e._dt)}`,
              color: e.color,
              sharedAvatars: users.filter((u) => e.sharedWith?.includes(u.id)).slice(0, 3),
              event: e,
            };
          }),
        }
      : null;

    const taskRows = computed.openTasks.slice(0, 3).map((t) => {
      const overdue =
        !t.completed &&
        !!t.dueDate &&
        new Date(`${t.dueDate}T${t.dueTime || '23:59'}`) < new Date();
      const assigned =
        t.assignedTo && t.assignedTo !== getCurrentUserId()
          ? users.find((u) => u.id === t.assignedTo)
          : null;
      return {
        id: t.id,
        text: t.text,
        completed: t.completed || false,
        dotColorKey: t.completed ? 'muted' : overdue ? 'error' : (String(t.priority || 'muted')),
        overdueLabel: overdue ? 'overdue' : null,
        assignedAvatar: assigned
          ? {
              name: assigned.name,
              color: String((assigned as unknown as { color?: string }).color || ''),
            }
          : null,
      };
    });

    const taskSection = taskRows.length > 0
      ? {
          label: 'ON YOUR MIND',
          linkText: 'See all',
          rows: taskRows,
        }
      : null;

    return { greeting, hero, heroInsight, nextUp, people, moments, tasks: taskSection };
  }, [computed, todayDateKey, users, others, acct]);
}
