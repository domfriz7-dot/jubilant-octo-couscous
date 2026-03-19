// Telemetry (analytics + crash reporting).
// - Uses Firebase Analytics if available (best-effort).
// - Always falls back to local logger persistence.
// - Uses Sentry for exception capture when configured.

import { logEvent as persistEvent, logError } from './logger';
import { Platform } from 'react-native';
import { isFirebaseEnabled } from '../config/firebase';
import { getFirebaseApp } from './backend/firebaseClient';

let enabled = true;

// Debounce noisy screen_view tracking (e.g. rapid tab switching / focus churn).
let lastScreenName: string | null = null;
let lastScreenTs = 0;
// Slightly larger debounce to smooth rapid focus churn when users flick between tabs/screens.
// (We still rely on app-level route-change tracking; this is a safety net.)
const SCREEN_DEBOUNCE_MS = 800;

type FirebaseAnalytics = any;
let fbAnalytics: FirebaseAnalytics | null = null;
let firebaseLogEvent: ((analytics: unknown, name: string, params?: Record<string, unknown>) => void) | null = null;

// Segment (optional). Works in custom dev clients / production builds.
// In Expo Go, native modules may be unavailable; we treat it as best-effort.
type SegmentClient = {
  track?: (event: string, properties?: Record<string, unknown>) => void;
  screen?: (name: string, properties?: Record<string, unknown>) => void;
  identify?: (userId: string, traits?: Record<string, unknown>) => void;
  flush?: () => Promise<void> | void;
};
let segmentClient: SegmentClient | null = null;

function getSegmentWriteKey(): string | null {
  const key = (process.env as Record<string, string | undefined>)?.EXPO_PUBLIC_SEGMENT_WRITE_KEY;
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : null;
}

async function tryInitSegment(): Promise<void> {
  if (segmentClient) return;
  const writeKey = getSegmentWriteKey();
  if (!writeKey) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@segment/analytics-react-native');
    const createClient = mod?.createClient;
    if (typeof createClient !== 'function') return;
    segmentClient = createClient({ writeKey });
    // Best-effort flush to validate the client; ignore failures.
    await segmentClient?.flush?.();
  } catch {
    // ignore (likely missing native module in Expo Go)
    segmentClient = null;
  }
}

export function setTelemetryEnabled(next: boolean): void {
  enabled = !!next;
}

async function tryInitFirebaseAnalytics(): Promise<void> {
  // Firebase web analytics requires a DOM. Never load it on native.
  if (Platform.OS !== 'web') return;
  if (!isFirebaseEnabled()) return;
  if (fbAnalytics) return;

  try {
    // Firebase Analytics for RN can be finicky; this is best-effort.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('firebase/analytics');
    const { getAnalytics, logEvent } = mod ?? {};
    const app = getFirebaseApp();
    if (!app || typeof getAnalytics !== 'function' || typeof logEvent !== 'function') return;
    fbAnalytics = getAnalytics(app);
    firebaseLogEvent = logEvent;
  } catch {
    // ignore (likely unsupported in this runtime)
    // Intentionally ignored — non-critical failure
  }
}

function trySentryCapture(err: unknown, context: Record<string, unknown>): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    if (Sentry?.captureException) {
      Sentry.captureException(err, { extra: context });
    }
  } catch {
    // ignore
    // Intentionally ignored — non-critical failure
  }
}

export function logEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!enabled) return;

  // Local persistence for debugging (never blocks UI).
  persistEvent(name, params).catch(() => {});

  // Best-effort Firebase Analytics (web only).
  if (Platform.OS === 'web' && fbAnalytics && firebaseLogEvent) {
    try {
      firebaseLogEvent(fbAnalytics, name, params);
    } catch {
      // ignore
      // Intentionally ignored — non-critical failure
    }
  }

  // Best-effort Segment (native + web, depending on runtime).
  if (segmentClient?.track) {
    try {
      segmentClient.track(name, params);
    } catch {
      // ignore
      // Intentionally ignored — non-critical failure
    }
  }
}

export function trackScreen(screenName: string, params: Record<string, unknown> = {}): void {
  const now = Date.now();
  // If the same screen is reported repeatedly within a short window, drop it.
  if (lastScreenName === screenName && now - lastScreenTs < SCREEN_DEBOUNCE_MS) return;
  lastScreenName = screenName;
  lastScreenTs = now;

  // Segment has a first-class screen event.
  if (segmentClient?.screen) {
    try {
      segmentClient.screen(screenName, params);
    } catch {
      // ignore
      // Intentionally ignored — non-critical failure
    }
  }

  // Still persist our own canonical event.
  logEvent('screen_view', { screen_name: screenName, ...params });
}

export function identify(userId: string, traits: Record<string, unknown> = {}): void {
  if (!enabled) return;
  if (segmentClient?.identify) {
    try {
      segmentClient.identify(userId, traits);
    } catch {
      // ignore
      // Intentionally ignored — non-critical failure
    }
  }
}

export function captureException(err: unknown, context: Record<string, unknown> = {}): void {
  if (!enabled) return;
  trySentryCapture(err, context);
  // Also persist to local logger so you can inspect without Sentry.
  logError('Telemetry.Exception', err, context).catch(() => {});
}

export async function initTelemetry(): Promise<true> {
  await tryInitFirebaseAnalytics();
  await tryInitSegment();
  return true;
}
