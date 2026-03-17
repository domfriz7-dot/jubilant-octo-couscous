import { z } from 'zod';

// Shared primitives
export const zDateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).catch('1970-01-01');
export const zTimeHHmm = z.string().regex(/^\d{2}:\d{2}$/).catch('18:00');
export const zId = z.union([z.string(), z.number()]).transform((v) => String(v));
export const zString = z.string().catch('');
export const zBool = z.boolean().catch(false);
export const zNum = z.number().catch(0);

// Users / connections (permissive, but stable)
export const zUser = z
  .object({
    id: zId,
    name: zString,
    email: zString,
    relationship: z.string().optional(),
    color: z.string().optional(),
    avatar: z.string().optional().nullable(),
    level: z.number().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const zUsersArray = z.array(zUser).catch([]);

// Tasks
export const zTask = z
  .object({
    id: zId,
    title: zString,
    done: z.boolean().optional(),
    dueDate: zDateKey.optional(),
    dueTime: zTimeHHmm.optional(),
    reminderTime: zTimeHHmm.optional(),
    repeat: z.string().optional(),
    repeatWeeklyDay: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const zTasksArray = z.array(zTask).catch([]);

// Calendar events
export const zEvent = z
  .object({
    id: zId,
    title: zString,
    date: zDateKey,
    time: zTimeHHmm.optional(),
    description: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    createdBy: z.string().optional(),
    sharedWith: z.array(z.string()).optional().catch([]),
    tags: z.array(z.string()).optional().catch([]),
    cancelled: z.boolean().optional(),
    reminder: z.any().optional(),
    recurrence: z.any().optional(),
    durationMinutes: z.number().optional(),
  })
  .passthrough();

export const zEventsArray = z.array(zEvent).catch([]);

// Moments
export const zMoment = z
  .object({
    id: zId,
    date: zDateKey,
    title: zString.optional(),
    note: zString.optional(),
    photoUri: z.string().optional().nullable(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const zMomentsArray = z.array(zMoment).catch([]);

// Pulse entries
export const zPulseEntry = z
  .object({
    id: zId.optional(),
    partnerId: z.string().optional(),
    date: zDateKey,
    pulseId: z.string(),
    note: z.string().optional().nullable(),
  })
  .passthrough();

export const zPulseArray = z.array(zPulseEntry).catch([]);

// Generic maps
export const zStringRecord = z.record(z.string(), z.unknown()).catch({});
export const zStringToStringMap = z.record(z.string(), z.string()).catch({});


// Connections + invites (legacy)
export const zConnection = z
  .object({
    id: zId,
    name: zString,
    email: zString.optional(),
    color: z.string().optional(),
    avatar: z.string().optional().nullable(),
    relationship: z.string().optional(),
    level: z.number().optional(),
    linkedVia: z.string().optional(),
    createdAt: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

export const zConnectionsArray = z.array(zConnection).catch([]);

export const zInvite = z
  .object({
    id: zId,
    code: zString,
    toEmail: zString.optional(),
    status: z.string().optional(),
    createdAt: z.union([z.number(), z.string()]).optional(),
    acceptedAt: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

export const zInvitesArray = z.array(zInvite).catch([]);

export const zUserProfile = z
  .object({
    id: zId.optional(),
    name: zString.optional(),
    email: zString.optional(),
    color: z.string().optional(),
    photoUri: z.string().optional().nullable(),
  })
  .passthrough()
  .nullable()
  .catch(null);

export const zPulseData = z.object({ entries: zPulseArray }).catch({ entries: [] });

export const zXpData = z
  .object({
    totalXP: z.number().catch(0),
    currentLevel: z.number().catch(1),
    xpToNextLevel: z.number().catch(0),
    achievements: z.array(z.unknown()).catch([]),
    streaks: z
      .object({
        current: z.number().catch(0),
        best: z.number().catch(0),
        lastCompletedDate: z.union([z.string(), z.null()]).catch(null),
      })
      .catch({ current: 0, best: 0, lastCompletedDate: null }),
    dailyTaskXP: z
      .object({
        date: zDateKey.catch('1970-01-01'),
        count: z.number().catch(0),
      })
      .catch({ date: '1970-01-01', count: 0 }),
    stats: z
      .object({
        tasksCompleted: z.number().catch(0),
        eventsCreated: z.number().catch(0),
        eventsAttended: z.number().catch(0),
        calendarsShared: z.number().catch(0),
        daysActive: z.number().catch(0),
      })
      .catch({ tasksCompleted: 0, eventsCreated: 0, eventsAttended: 0, calendarsShared: 0, daysActive: 0 }),
    history: z.array(z.unknown()).catch([]),
  })
  .passthrough()
  .catch({
    totalXP: 0,
    currentLevel: 1,
    xpToNextLevel: 0,
    achievements: [],
    streaks: { current: 0, best: 0, lastCompletedDate: null },
    dailyTaskXP: { date: '1970-01-01', count: 0 },
    stats: { tasksCompleted: 0, eventsCreated: 0, eventsAttended: 0, calendarsShared: 0, daysActive: 0 },
    history: [],
  });

export const zStoredMoment = z
  .object({
    id: zId,
    connectionId: z.string().optional().nullable(),
    type: z.string().optional(),
    kind: z.string().optional(),
    milestoneId: z.string().optional(),
    emoji: z.string().optional(),
    title: zString.optional(),
    body: z.string().optional(),
    photoUri: z.string().optional().nullable(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const zStoredMomentsArray = z.array(zStoredMoment).catch([]);
