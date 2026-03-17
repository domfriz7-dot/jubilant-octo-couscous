import { useEffect } from 'react';
import { logError } from '../../services/logger';
import { reportError } from '../../utils/reportError';

/**
 * Installs a small runtime safety layer:
 * - global JS exception handler -> logError
 * - unhandled promise rejection handler -> logError
 *
 * ErrorBoundary handles render-time crashes; this covers async/rejection crashes.
 */
export default function useBootstrapRuntimeSafety(): void {
  useEffect(() => {
    const g = globalThis as Record<string, unknown>;
    if (g.__uandme_runtime_safety_installed) return;
    g.__uandme_runtime_safety_installed = true;

    // Global fatal/non-fatal handler (React Native)
    try {
      const ErrorUtilsAny: Record<string, unknown> = (globalThis as Record<string, unknown>).ErrorUtils;
      if (ErrorUtilsAny?.setGlobalHandler) {
        const prev = ErrorUtilsAny.getGlobalHandler?.();
        ErrorUtilsAny.setGlobalHandler((err: unknown, isFatal?: boolean) => {
          try {
            logError('GlobalError', err, { isFatal: !!isFatal });
          } catch (e) { reportError('Bootstrap.RuntimeSafety', e); // ignore
          }
          if (typeof prev === 'function') {
            try {
              prev(err, isFatal);
            } catch (e) { reportError('Bootstrap.RuntimeSafety', e); // ignore
            }
          }
        });
      }
    } catch (e) { reportError('Bootstrap.RuntimeSafety', e); // ignore
    }

    // Unhandled promise rejections (supported in modern RN)
    try {
      const handler = (reason: unknown, _promise?: unknown) => {
        logError('UnhandledRejection', reason, { hasPromise: !!_promise });
      };
      if (typeof (globalThis as Record<string, unknown>).addEventListener === 'function') {
        ((globalThis as Record<string, unknown>).addEventListener as (evt: string, fn: (...args: unknown[]) => void) => void)('unhandledrejection', handler);
      }
      // Optional: RN internal hook (not always present)
      if (typeof (Promise as unknown as Record<string, unknown>).onPossiblyUnhandledRejection === 'function') {
        (Promise as unknown as { onPossiblyUnhandledRejection?: (fn: (e: Error) => void) => void }).onPossiblyUnhandledRejection(handler as (e: Error) => void);
      }
    } catch (e) { reportError('Bootstrap.RuntimeSafety', e); // ignore
    }
  }, []);
}