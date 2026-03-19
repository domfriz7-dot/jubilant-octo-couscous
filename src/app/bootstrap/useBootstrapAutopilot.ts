import { useEffect } from 'react';
import CalendarService from '../../services/CalendarService';
import { reportError } from '../../utils/reportError';

/** Loads events from storage on app start so the rest of the app can access
 *  them synchronously via CalendarService.getEvents(). */
export default function useBootstrapAutopilot(): void {
  useEffect(() => {
    CalendarService.load().catch((e) => reportError('useBootstrapAutopilot', e));
  }, []);
}
