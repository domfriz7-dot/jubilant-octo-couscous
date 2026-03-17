import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { reportError } from '../../utils/reportError';

/** Suppress known noisy third-party warnings and install a global promise
 *  rejection handler so nothing slips through silently. */
export default function useBootstrapRuntimeSafety(): void {
  useEffect(() => {
    // Suppress known benign warnings from third-party libs
    LogBox.ignoreLogs([
      'Warning: componentWillReceiveProps',
      'Warning: componentWillMount',
      'Non-serializable values were found in the navigation state',
      'Require cycle:',
    ]);

    const handler = (event: PromiseRejectionEvent) => {
      reportError('UnhandledPromiseRejection', event.reason);
    };
    // @ts-ignore — global on React Native
    global.addEventListener?.('unhandledrejection', handler);
    return () => {
      // @ts-ignore
      global.removeEventListener?.('unhandledrejection', handler);
    };
  }, []);
}
