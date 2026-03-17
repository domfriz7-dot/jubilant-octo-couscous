// src/navigation/types.ts
// Centralized React Navigation param lists.
// Keep these accurate: this file is the backbone for typed navigation.

import type { CalendarEvent } from '../types/calendar';
import type { User } from '../types';
import type { Connection } from '../types/connections';
import type { DateIdea } from '../services/DateIdeasService';

export type MainTabParamList = {
  Home: undefined;
  CalendarTab: undefined;
  Connections: undefined;
  Tasks: undefined;
  Profile: undefined;
};

export type AutoSchedulePreset = {
  partnerId?: string;
  durationMins?: number;
  startHour?: number;
  endHour?: number;
  days?: number;
};

export type NativeCalendarRef = {
  id: string;
  title?: string;
  sourceName?: string;
};

export type RootStackParamList = {
  MainTabs: { screen?: keyof MainTabParamList; params?: Record<string, unknown> } | undefined;

  // Core
  Shared: undefined;
  ShareCalendar: undefined;
  ConnectionDetail: { user?: User; userId?: string } | undefined;
  PlansTogether: { connectionId?: string; user?: User } | undefined;
  ConnectionEvents: { user?: User; mode?: 'upcoming' | 'past' } | undefined;
  BondBreakdown: { user?: User } | undefined;

  AddEvent:
    | {
        mode?: 'edit' | 'create';
        eventId?: string;
        selectedDate?: string; // YYYY-MM-DD
        preSharedWith?: Array<User | Connection>; // users/ids to pre-share with
        prefill?: Record<string, unknown>; // legacy
        // Used by EmergencyDate / quick-add flows
        preset?: {
          title?: string;
          durationMins?: number;
          category?: string;
        };
        connectionId?: string;
        source?: string;
      }
    | undefined;

  EventDetails: { event?: CalendarEvent; eventId?: string } | undefined;

  // Premium Couple Experience
  RelationshipEngine: undefined;
  WeeklyReport: undefined;
  MemoryTimeline: undefined;
  DateGenerator: { time?: string } | undefined;
  TonightSuggestion: undefined;
  AutoSchedule: { preset?: AutoSchedulePreset; idea?: DateIdea } | undefined;
  Wallpaper: undefined;

  // Relationship Autopilot
  Autopilot: undefined;
  AutopilotSetup: undefined;

  // Premium Intelligence
  HealthScore: undefined;
  ConflictPredictor: undefined;
  DailyRitual: undefined;
  AIDatePlanner: undefined;
  EmergencyDate: { urgency?: string } | undefined;

  // Calendar Import
  CalendarImportSetup: { calendars?: NativeCalendarRef[] } | undefined;
  CalendarImportSuccess: { imported?: number; added?: number; total?: number } | undefined;

  // Invite + Settings
  Invite: { prefillCode?: string } | undefined;
  Settings: undefined;
  Paywall: { source?: string; returnTo?: keyof RootStackParamList | string } | undefined;
};
