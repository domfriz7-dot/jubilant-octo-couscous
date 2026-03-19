import { useEffect } from 'react';
import { reportError } from '../../utils/reportError';

/** Requests device calendar permissions and optionally syncs events.
 *  Gracefully no-ops if the user denies or if expo-calendar isn't available. */
export default function useBootstrapCalendarSync(): void {
  useEffect(() => {
    (async () => {
      try {
        const Calendar = await import('expo-calendar');
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') return;
        // Permission granted – real sync logic would go here.
      } catch (e) {
        reportError('useBootstrapCalendarSync', e);
      }
    })();
  }, []);
}
