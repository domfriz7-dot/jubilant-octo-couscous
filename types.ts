import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import type { RootStackParamList } from './types';

import { lazyScreen } from './lazyScreen';
import { rootScreens } from './screenRegistry';

const Stack = createStackNavigator<RootStackParamList>();

// Modal options: iOS bottom-sheet style, Android fade-from-bottom.
const modalOptions = Platform.select({
  ios: {
    ...TransitionPresets.ModalSlideFromBottomIOS,
    gestureEnabled: true,
  },
  android: {
    ...TransitionPresets.FadeFromBottomAndroid,
    gestureEnabled: true,
  },
}) ?? { gestureEnabled: true };

// Default transitions: keep them subtle and consistent.
// (The default Android slide can feel "jarring" when bouncing between many screens.)
const defaultTransition = Platform.select({
  ios: TransitionPresets.SlideFromRightIOS,
  // ScaleFromCenterAndroid can feel "game-y" / jarring in a dense app.
  // Use the iOS-style slide which reads more native and less attention-grabbing.
  android: TransitionPresets.SlideFromRightIOS,
}) ?? {};

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        ...defaultTransition,
      }}
    >
      <Stack.Screen name="MainTabs" component={lazyScreen(rootScreens.MainTabs)} />

      {/* Core */}
      <Stack.Screen name="Shared" component={lazyScreen(rootScreens.Shared)} />
      <Stack.Screen name="ShareCalendar" component={lazyScreen(rootScreens.ShareCalendar)} />
      <Stack.Screen name="ConnectionDetail" component={lazyScreen(rootScreens.ConnectionDetail)} />
      <Stack.Screen name="PlansTogether" component={lazyScreen(rootScreens.PlansTogether)} />
      <Stack.Screen name="ConnectionEvents" component={lazyScreen(rootScreens.ConnectionEvents)} />
      <Stack.Screen name="BondBreakdown" component={lazyScreen(rootScreens.BondBreakdown)} />
      <Stack.Screen name="AddEvent" component={lazyScreen(rootScreens.AddEvent)} options={modalOptions} />
      <Stack.Screen name="EventDetails" component={lazyScreen(rootScreens.EventDetails)} />

      {/* Premium Couple Experience */}
      <Stack.Screen name="RelationshipEngine" component={lazyScreen(rootScreens.RelationshipEngine)} />
      <Stack.Screen name="WeeklyReport" component={lazyScreen(rootScreens.WeeklyReport)} />
      <Stack.Screen name="MemoryTimeline" component={lazyScreen(rootScreens.MemoryTimeline)} />
      <Stack.Screen name="DateGenerator" component={lazyScreen(rootScreens.DateGenerator)} />
      <Stack.Screen name="TonightSuggestion" component={lazyScreen(rootScreens.TonightSuggestion)} options={{ ...defaultTransition, presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="AutoSchedule" component={lazyScreen(rootScreens.AutoSchedule)} />
      <Stack.Screen name="Wallpaper" component={lazyScreen(rootScreens.Wallpaper)} options={modalOptions} />

      <Stack.Screen name="Autopilot" component={lazyScreen(rootScreens.Autopilot)} />
      <Stack.Screen name="AutopilotSetup" component={lazyScreen(rootScreens.AutopilotSetup)} options={modalOptions} />

      {/* Premium Intelligence Features */}
      <Stack.Screen name="HealthScore" component={lazyScreen(rootScreens.HealthScore)} />
      <Stack.Screen name="ConflictPredictor" component={lazyScreen(rootScreens.ConflictPredictor)} />
      <Stack.Screen name="DailyRitual" component={lazyScreen(rootScreens.DailyRitual)} />
      <Stack.Screen name="AIDatePlanner" component={lazyScreen(rootScreens.AIDatePlanner)} options={{ ...defaultTransition, presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="EmergencyDate" component={lazyScreen(rootScreens.EmergencyDate)} options={modalOptions} />

      {/* Calendar Import */}
      <Stack.Screen name="CalendarImportSetup" component={lazyScreen(rootScreens.CalendarImportSetup)} options={modalOptions} />
      <Stack.Screen name="CalendarImportSuccess" component={lazyScreen(rootScreens.CalendarImportSuccess)} />

      {/* Invite System */}
      <Stack.Screen name="Invite" component={lazyScreen(rootScreens.Invite)} />
      <Stack.Screen name="Settings" component={lazyScreen(rootScreens.Settings)} options={{ ...defaultTransition, presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="Paywall" component={lazyScreen(rootScreens.Paywall)} options={modalOptions} />
    </Stack.Navigator>
  );
}
