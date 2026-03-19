import { useMemo } from 'react';
import { tokens } from '../config/tokens';
import { weekTogether, sharedHistory, bondNarrative, balanceInsight, streakInsight, emptyConnection } from '../insights';
import type { User } from '../types';
import type { CalendarEvent } from '../types/calendar';
import type { Task } from '../types/tasks';
import { todayKey } from '../utils/dateTime';
import { getFirstName } from '../utils/partners';

const REL_LABELS: Record<string, string> = {
  partner: 'Partner',
  boyfriend: 'Boyfriend',
  girlfriend: 'Girlfriend',
  husband: 'Husband',
  wife: 'Wife',
  fiance: 'Fiancé',
  fiancee: 'Fiancée',
  spouse: 'Spouse',
  friend: 'Friend',
  family: 'Family',
  colleague: 'Colleague',
  other: 'Connection',
};

const REL_ICONS: Record<string, string> = {
  partner: 'heart',
  boyfriend: 'heart',
  girlfriend: 'heart',
  husband: 'heart',
  wife: 'heart',
  fiance: 'heart',
  fiancee: 'heart',
  spouse: 'heart',
  friend: 'smile',
  family: 'home',
  colleague: 'briefcase',
};

const PRI_COLORS = tokens.priority;

function nudgeColorKey(type: string): string {
  const map: Record<string, string> = { warning: 'warning', gentle: 'error', celebration: 'streak', positive: 'success', info: 'accent' };
  return map[type] || 'muted';
}

export function useConnectionDetailViewModel(args: {
  user: User & { color?: string; relationship?: string; level?: number; email?: string };
  events: CalendarEvent[];
  allEvents: CalendarEvent[];
  sharedTasks: Task[];
  acct: Record<string, unknown> | null;
}): Record<string, unknown> {
  const { user, events, allEvents, sharedTasks, acct } = args;

  return useMemo(() => {
    const firstName = getFirstName(user.name);

    const profile = {
      name: user.name,
      email: (typeof user === 'object' && user !== null ? (user as unknown as Record<string, unknown>).email : undefined),
      relLabel: (() => {
        const rel = (typeof user === 'object' && user !== null ? (user as unknown as Record<string, unknown>).relationship : undefined);
        return REL_LABELS[String(rel)] || 'Connection';
      })(),
      relIcon: (() => {
        const rel = (typeof user === 'object' && user !== null ? (user as unknown as Record<string, unknown>).relationship : undefined);
        return REL_ICONS[String(rel)] || 'link';
      })(),
      levelLabel: (() => {
        const lvl = (typeof user === 'object' && user !== null ? (user as unknown as Record<string, unknown>).level : undefined);
        const n = typeof lvl === 'number' && Number.isFinite(lvl) ? lvl : 1;
        return `Level ${n}`;
      })(),
      levelProgress: (() => {
        const lvl = (typeof user === 'object' && user !== null ? (user as unknown as Record<string, unknown>).level : undefined);
        const n = typeof lvl === 'number' && Number.isFinite(lvl) ? lvl : 1;
        return Math.min(n * 20, 100);
      })(),
    };

    const totalShared = allEvents.filter((e: { sharedWith?: string[]; createdBy?: string }) => e.sharedWith?.includes(user.id) || e.createdBy === user.id).length;
    const weekEvents = events.filter((e: { date?: string; startDate?: string }) => {
      const d = new Date(`${e.date}T00:00:00`);
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return d >= now && d <= weekEnd;
    }).length;

    const bondStrength = totalShared >= 20 ? 'Strong' : totalShared >= 5 ? 'Growing' : 'New';
    const bondColor = totalShared >= 20 ? 'success' : totalShared >= 5 ? 'warning' : 'muted';
    const stats = [
      { icon: 'calendar', value: events.length, label: 'coming up', colorKey: 'muted' },
      { icon: 'clock', value: totalShared, label: 'together', colorKey: 'muted' },
      { icon: 'check-circle', value: bondStrength, label: 'bond', colorKey: bondColor },
    ];

    const weekInsight = weekTogether(weekEvents, firstName);
    const historyInsight = sharedHistory(totalShared, firstName);

    let accountability: Record<string, unknown> = { visible: false };
    if (acct && (acct.totalTasks > 0 || acct.sharedEventsCount > 0)) {
      const bal: number = acct.balance;
      let balanceLabel: string;
      if (bal >= 40 && bal <= 60) balanceLabel = "You're in rhythm";
      else if (bal < 40) balanceLabel = `${firstName} has been picking up more`;
      else balanceLabel = "You've been doing more of the lifting";

      accountability = {
        visible: true,
        streakLabel: acct.streak?.current > 0 ? `${acct.streak.current} day streak` : null,
        streakDays: acct.streak?.current,
        streakInsight: streakInsight(acct.streak?.current || 0, firstName),
        balanceLabel,
        balanceInsight: balanceInsight(bal, firstName, acct.myCompletions, acct.theirCompletions),
        balancePct: bal,
        myLabel: `You · ${acct.myCompletions}/${acct.myTotal}`,
        theirLabel: `${firstName} · ${acct.theirCompletions}/${acct.theirTotal}`,
        missed: acct.totalMissed > 0
          ? {
              text: `${acct.totalMissed} thing${acct.totalMissed > 1 ? 's' : ''} slipping between you`,
              yoursCount: acct.missedByMe?.length || 0,
              theirsCount: acct.missedByThem?.length || 0,
              detail: [
                (acct.missedByMe?.length || 0) > 0 ? `${acct.missedByMe.length} yours` : '',
                (acct.missedByThem?.length || 0) > 0 ? `${acct.missedByThem.length} theirs` : '',
              ]
                .filter(Boolean)
                .join(' · '),
            }
          : null,
        nudge: acct.nudge ? { text: acct.nudge.text, icon: acct.nudge.icon, colorKey: nudgeColorKey(acct.nudge.type) } : null,
      };
    }

    const taskRows = sharedTasks.slice(0, 8).map((t: Task) => {
      const priColor = PRI_COLORS[(t.priority as keyof typeof PRI_COLORS) || "low"];
      const isTheirs = t.assignedTo === user.id;
      const isOverdue = !t.completed && !!t.dueDate && t.dueDate < todayKey();
      return {
        id: t.id,
        text: t.text,
        completed: t.completed,
        priorityColor: priColor,
        priorityLabel: t.priority?.toUpperCase() || null,
        assignLabel: isTheirs ? firstName : 'You',
        assignIcon: isTheirs ? 'user' : 'edit-3',
        assignColor: (() => {
          if (!isTheirs) return null;
          const c = (typeof user === 'object' && user !== null ? (user as unknown as Record<string, unknown>).color : null);
          return typeof c === 'string' ? c : null;
        })(),
        isOverdue,
        dateLabel: t.dueDate ? `${t.dueDate}${isOverdue ? ' · overdue' : ''}` : null,
      };
    });

    const eventRows = events.map((e: CalendarEvent) => ({
      id: e.id,
      title: e.title,
      when: `${new Date(`${e.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${e.time}`,
      color: e.color,
      event: e,
    }));

    const emptyMessage = emptyConnection(firstName) || `You and ${firstName} are both free — good time to plan something.`;

    const streakDays = acct?.streak?.current || 0;
    const bal = acct?.balance ?? 50;
    const bond = bondNarrative(totalShared, streakDays, bal, firstName);

    return {
      profile,
      stats,
      weekInsight,
      historyInsight,
      accountability,
      sharedTasks: { label: 'Between you two', rows: taskRows },
      upcomingEvents: { label: 'Your next moments', emptyTitle: 'Nothing planned yet', emptyMessage, rows: eventRows },
      actionLabel: `Plan something with ${firstName}`,
      bondMessage: bond || historyInsight || 'Your bond grows stronger with every shared moment',
    };
  }, [user, events, allEvents, sharedTasks, acct]);
}