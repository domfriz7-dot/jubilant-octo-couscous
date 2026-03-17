import type { RootStackParamList, MainTabParamList } from './types';
import type { ScreenGetter } from './lazyScreen';

type RootKey = keyof RootStackParamList;
type TabKey = keyof MainTabParamList;

/**
 * NOTE:
 *  - Use require() to avoid importing screens into the navigation module graph.
 *  - This keeps src/navigation/** strict-checkable without forcing src/screens/** strict.
 */
export const rootScreens: Record<RootKey, ScreenGetter> = {
  MainTabs: () => require('./MainTabs').default,

  // Core
  Shared: () => require('../screens/SharedScreen').default,
  ShareCalendar: () => require('../screens/ShareCalendarScreen').default,
  ConnectionDetail: () => require('../screens/ConnectionDetailScreen').default,
  PlansTogether: () => require('../screens/PlansTogetherScreen').default,
  ConnectionEvents: () => require('../screens/ConnectionEventsScreen').default,
  BondBreakdown: () => require('../screens/BondBreakdownScreen').default,
  AddEvent: () => require('../screens/AddEventScreen').default,
  EventDetails: () => require('../screens/EventDetailsScreen').default,

  // Premium Couple Experience
  RelationshipEngine: () => require('../screens/RelationshipEngineScreen').default,
  WeeklyReport: () => require('../screens/WeeklyReportScreen').default,
  MemoryTimeline: () => require('../screens/MemoryTimelineScreen').default,
  DateGenerator: () => require('../screens/DateGeneratorScreen').default,
  TonightSuggestion: () => require('../screens/TonightSuggestionScreen').default,
  AutoSchedule: () => require('../screens/AutoScheduleScreen').default,
  Wallpaper: () => require('../screens/WallpaperScreen').default,

  // Relationship Autopilot
  Autopilot: () => require('../screens/AutopilotDashboardScreen').default,
  AutopilotSetup: () => require('../screens/AutopilotSetupScreen').default,

  // Premium Intelligence
  HealthScore: () => require('../screens/HealthScoreScreen').default,
  ConflictPredictor: () => require('../screens/ConflictPredictorScreen').default,
  DailyRitual: () => require('../screens/DailyRitualScreen').default,
  AIDatePlanner: () => require('../screens/AIDatePlannerScreen').default,
  EmergencyDate: () => require('../screens/EmergencyDateScreen').default,

  // Calendar Import
  CalendarImportSetup: () => require('../screens/CalendarImportSetupScreen').default,
  CalendarImportSuccess: () => require('../screens/CalendarImportSuccessScreen').default,

  // Invite + Settings
  Invite: () => require('../screens/InviteScreen').default,
  Settings: () => require('../screens/SettingsScreen').default,
  Paywall: () => require('../screens/PaywallScreen').default,
};

export const tabScreens: Record<TabKey, ScreenGetter> = {
  Home: () => require('../screens/HomeScreen').default,
  CalendarTab: () => require('../screens/CalendarScreen').default,
  Connections: () => require('../screens/ConnectionsScreen').default,
  Tasks: () => require('../screens/TasksScreen').default,
  Profile: () => require('../screens/ProfileScreen').default,
};
