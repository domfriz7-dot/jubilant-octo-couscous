import { useEffect } from 'react';
import NativeCalendarSync from '../../services/NativeCalendarSync';
import { logEvent } from '../../services/logger';

/**
 * Silently initializes native calendar sync on app start.
 * Only creates the U&Me calendar if the user already granted permissions.
 * Does NOT prompt — that happens explicitly via CalendarImportSetupScreen.
 */
export default function useBootstrapCalendarSync() {
  useEffect(() => {
    let alive = true;
    (async () => {
      const hasPerms = await NativeCalendarSync.hasPermissions();
      if (!alive || !hasPerms) return;
      const ok = await NativeCalendarSync.init();
      if (ok) logEvent('CalSync.BootstrapReady');
    })();
    return () => { alive = false; };
  }, []);
}
