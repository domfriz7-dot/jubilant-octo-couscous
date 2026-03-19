import * as Sentry from '@sentry/react-native';

let _initialized = false;

function getDsn(): string | undefined {
  // Expo public env var pattern.
  const g = globalThis as unknown as { process?: { env?: Record<string, unknown> } };
  const dsnRaw = g?.process?.env?.EXPO_PUBLIC_SENTRY_DSN;
  const dsn = typeof dsnRaw === 'string' ? dsnRaw : undefined;
  if (dsn && typeof dsn === 'string' && dsn.trim().length > 0) return dsn.trim();
  return undefined;
}

export function initSentry(): void {
  if (_initialized) return;
  _initialized = true;

  const dsn = getDsn();
  if (!dsn) {
    // No DSN configured; keep app running with zero overhead.
    return;
  }

  // Avoid hard dependency on expo-constants; it may not be installed.
  let release: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants');
    const slug = Constants?.expoConfig?.slug;
    const version = Constants?.expoConfig?.version;
    if (slug && version) release = `${slug}@${version}`;
  } catch {
    // ignore
    // Intentionally ignored — non-critical failure
  }

  Sentry.init({
    dsn,
    enabled: true,
    debug: __DEV__,
    release,
    // Keep this conservative for now (you can tune later)
    tracesSampleRate: __DEV__ ? 0.0 : 0.05,
  });

  // Tag errors with EAS Update information for easier debugging.
  // Based on Expo's Sentry guide.
  try {
    // Avoid hard dependency on expo-updates; it may not be installed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Updates = require('expo-updates');

    const scope: Record<string, unknown> = Sentry.getGlobalScope();
    scope.setTag('expo-update-id', Updates.updateId);
    scope.setTag('expo-is-embedded-update', Updates.isEmbeddedLaunch);

    const manifest: Record<string, unknown> = Updates.manifest;
    const metadata = manifest && 'metadata' in manifest ? manifest.metadata : undefined;
    const extra = manifest && 'extra' in manifest ? manifest.extra : undefined;
    const updateGroup = metadata && 'updateGroup' in metadata ? metadata.updateGroup : undefined;

    if (typeof updateGroup === 'string') {
      scope.setTag('expo-update-group-id', updateGroup);
      const owner = extra?.expoClient?.owner ?? '[account]';
      const slug = extra?.expoClient?.slug ?? '[project]';
      scope.setTag('expo-update-debug-url', `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`);
    } else if (Updates.isEmbeddedLaunch) {
      scope.setTag('expo-update-debug-url', 'not applicable for embedded updates');
    }
  } catch {
    // best-effort only
    // Intentionally ignored — non-critical failure
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  try {
    const dsn = getDsn();
    if (!dsn) return;
    if (context) {
      Sentry.withScope((scope) => {
        scope.setContext('context', context);
        Sentry.captureException(error);
      });
      return;
    }
    Sentry.captureException(error);
  } catch {
    // never crash the app due to telemetry
    // Intentionally ignored — non-critical failure
  }
}
