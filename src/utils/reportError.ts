import * as Sentry from '@sentry/react-native';

/**
 * Central error reporter.  Logs to console in dev and forwards to Sentry in
 * production.  All catches across the app should funnel through here so we get
 * a single place to adjust error-handling policy.
 */
export function reportError(context: string, error: Error | unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  if (__DEV__) {
    console.error(`[${context}]`, err);
  } else {
    Sentry.withScope((scope) => {
      scope.setTag('context', context);
      Sentry.captureException(err);
    });
  }
}
