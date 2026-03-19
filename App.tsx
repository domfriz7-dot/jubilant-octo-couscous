// Required for React Navigation + gesture handler on Android
import 'react-native-gesture-handler';

// Initialize error tracking as early as possible.
import { initSentry } from './src/config/sentry';
initSentry();

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import XPNotification from './src/components/XPNotification';
import LevelUpModal from './src/components/LevelUpModal';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
import RootNavigator, { RootStackParamList } from './src/navigation/RootNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { ThemeProvider, useAppTheme } from './src/ui/theme/ThemeProvider';
import ErrorBoundary from './src/components/ErrorBoundary';

import { XPProvider } from './src/app/context/XPContext';
import { ConnectionsProvider } from './src/app/context/ConnectionsContext';
import { SubscriptionProvider } from './src/app/context/SubscriptionContext';
import useBootstrapTelemetry from './src/app/bootstrap/useBootstrapTelemetry';
import useOnboardingGate from './src/app/bootstrap/useOnboardingGate';
import useBootstrapXP from './src/app/bootstrap/useBootstrapXP';
import useBootstrapDeepLinks from './src/app/bootstrap/useBootstrapDeepLinks';
import useBootstrapAutopilot from './src/app/bootstrap/useBootstrapAutopilot';
import useBootstrapCalendarSync from './src/app/bootstrap/useBootstrapCalendarSync';
import useBootstrapBackend from './src/app/bootstrap/useBootstrapBackend';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import OfflineBanner from './src/components/OfflineBanner';
import useBootstrapRuntimeSafety from './src/app/bootstrap/useBootstrapRuntimeSafety';
import useBootstrapAuth from './src/app/bootstrap/useBootstrapAuth';
import PlacesKeyService from './src/services/PlacesKeyService';
import NotificationService from './src/services/NotificationService';
import { initIdentityResult } from './src/services/IdentityService';
import { runMigrations, checkDataIntegrity } from './src/services/StorageMigration';
import DataBackupService from './src/services/DataBackupService';
import NudgeService from './src/services/NudgeService';
import { trackScreen } from './src/services/Telemetry';
import { reportError } from './src/utils/reportError';

type NotificationPayload = {
  kind?: string;
  eventId?: string;
  [k: string]: unknown;
};

function IdentityGate({ children }: { children?: React.ReactNode }): JSX.Element {
  const { theme } = useAppTheme();
  const [ready, setReady] = useState(false);
  // If identity init stalls (native module edge-cases), never block the whole app.
  // We allow the app to continue using local fallback IDs.
  const withTimeout = useCallback(<T,>(p: Promise<T>, ms = 8000): Promise<T> => {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Identity init timed out after ${ms}ms`)), ms)
      ),
    ]);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await runMigrations();
        const [integrity] = await Promise.all([
          checkDataIntegrity(),
          DataBackupService.autoBackupIfNeeded().catch(() => {}),
          NudgeService.scheduleNudgeNotification().catch(() => {}),
          withTimeout(initIdentityResult(), 8000),
        ]);
        if (!integrity.ok) {
          reportError('IdentityGate.integrity', integrity.issues);
        }
      } catch (e) {
        reportError('IdentityGate.boot', e);
      } finally {
        if (!alive) return;
        setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [withTimeout]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.bg.default }} />;
  }
  return <>{children}</>;
}

function AppShell(): JSX.Element {
  const { isDark, theme } = useAppTheme();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const routeNameRef = useRef<string | null>(null);
  const pendingNotificationRef = useRef<NotificationPayload | null>(null);
  // Use a ref (not state) so handleNotificationNav always reads the current
  // value without needing to be recreated — avoids a stale-closure bug where
  // navReady was still false inside the callback when onReady fired.
  const navReadyRef = useRef(false);

  const handleNotificationNav = useCallback((data: NotificationPayload) => {
    const nav = navigationRef?.current;
    if (!data?.kind) return;
    // If nav isn't ready yet, queue the latest payload.
    if (!navReadyRef.current || !nav?.navigate) {
      pendingNotificationRef.current = data;
      return;
    }
    try {
      switch (data.kind) {
        case 'event_reminder':
          if (data.eventId) nav.navigate('EventDetails', { eventId: data.eventId });
          break;
        case 'task_reminder':
          nav.navigate('MainTabs', { screen: 'Tasks' });
          break;
        case 'invite_received':
        case 'invite_accepted':
        case 'invite_declined':
          nav.navigate('MainTabs', { screen: 'Connections' });
          break;
        case 'nudge':
          nav.navigate('MainTabs', { screen: 'Home' });
          break;
        case 'weekly_report':
          nav.navigate('WeeklyReport');
          break;
        case 'daily_digest':
          nav.navigate('MainTabs', { screen: 'CalendarTab' });
          break;
        case 'event_change':
          if (data.eventId) nav.navigate('EventDetails', { eventId: data.eventId });
          break;
        default:
          break;
      }
    } catch (e) {
      reportError('App', e as any);
      pendingNotificationRef.current = data;
    }
  }, []);

  // Bootstrap side-effects (kept out of AppShell body logic)
  useBootstrapTelemetry();
  const { enabled: authEnabled, ready: authReady, user } = useBootstrapAuth();
  useBootstrapRuntimeSafety();
  useBootstrapDeepLinks(navigationRef);
  useBootstrapAutopilot();
  useBootstrapCalendarSync();
  useBootstrapBackend();
  const { isConnected, recheck: recheckNetwork } = useNetworkStatus();

  // Load optional Google Places API key from local storage (if not provided via env).
  useEffect(() => {
    PlacesKeyService.init();
  }, []);

  // Register for push notifications & set up tap-to-navigate routing.
  // Registration is best-effort — errors are caught inside NotificationService.
  useEffect(() => {
    NotificationService.registerForPushNotifications();
    NotificationService.setupResponseListener((data: NotificationPayload) => {
      handleNotificationNav(data);
    });
    return () => NotificationService.removeListeners();
  }, [handleNotificationNav]);

  const { isOnboardingComplete, markComplete } = useOnboardingGate();
  const { xpToast, levelUp, awardXP, hideXPToast, closeLevelUp } = useBootstrapXP();

  if (isOnboardingComplete === null) {
    return <View style={{ flex: 1, backgroundColor: theme.bg.default }} />;
  }
  if (!isOnboardingComplete) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={markComplete} />
      </SafeAreaProvider>
    );
  }

  if (authEnabled && !authReady) {
    return <View style={{ flex: 1, backgroundColor: theme.bg.default }} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.container, { backgroundColor: theme.bg.default }]}>
          <XPProvider value={awardXP}>
          <ConnectionsProvider>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              navReadyRef.current = true;
              const pending = pendingNotificationRef.current;
              pendingNotificationRef.current = null;
              if (pending) handleNotificationNav(pending);
            }}
            onStateChange={() => {
              try {
                const current = navigationRef.current?.getCurrentRoute?.()?.name ?? null;
                const prev = routeNameRef.current;
                if (current && current !== prev) {
                  routeNameRef.current = current;
                  trackScreen(current);
                }
              } catch (e) {
                reportError('App', e as any);
              }
            }}
          >
            {authEnabled && !user ? <AuthNavigator /> : <RootNavigator />}
          </NavigationContainer>
          </ConnectionsProvider>
          </XPProvider>

          <XPNotification visible={xpToast.visible} xp={xpToast.xp} reason={xpToast.reason} onHide={hideXPToast} />
          <LevelUpModal visible={levelUp.visible} levelData={levelUp.levelData} onClose={closeLevelUp} />
          <OfflineBanner visible={!isConnected} onRetry={recheckNetwork} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SubscriptionProvider>
          <IdentityGate><AppShell /></IdentityGate>
        </SubscriptionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });