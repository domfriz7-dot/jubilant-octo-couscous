import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version ?? '1.0.0',
    dist: String(Constants.expoConfig?.ios?.buildNumber ?? '1'),
    // Only sample a fraction of traces in production to keep costs down.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableNativeNagger: false,
    // Suppress noisy breadcrumb types
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') return null;
      return breadcrumb;
    },
  });
}
