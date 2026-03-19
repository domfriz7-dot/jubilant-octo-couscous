import { createClient } from '@segment/analytics-react-native';
import { reportError } from '../utils/reportError';

let analytics: ReturnType<typeof createClient> | null = null;

export function initTelemetry(): void {
  const writeKey = process.env.EXPO_PUBLIC_SEGMENT_WRITE_KEY;
  if (!writeKey) return;
  try {
    analytics = createClient({ writeKey, trackAppLifecycleEvents: true });
  } catch (e) {
    reportError('Telemetry.init', e);
  }
}

export function trackScreen(name: string, properties?: Record<string, unknown>): void {
  try {
    analytics?.screen(name, properties);
  } catch (e) {
    reportError('Telemetry.trackScreen', e);
  }
}

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  try {
    analytics?.track(event, properties);
  } catch (e) {
    reportError('Telemetry.trackEvent', e);
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  try {
    analytics?.identify(userId, traits);
  } catch (e) {
    reportError('Telemetry.identifyUser', e);
  }
}
