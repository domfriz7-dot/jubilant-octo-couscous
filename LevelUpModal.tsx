// src/app/bootstrap/useBootstrapAutopilot.js
import { useEffect } from 'react';
import AutopilotService from '../../services/AutopilotService';
import { logEvent, logError } from '../../services/logger';

/**
 * Runs Relationship Autopilot on app start if weekly run is due.
 * Local-first: no background task. Premium UX: silent success; only nudges on schedule creation.
 */
export default function useBootstrapAutopilot() {
  useEffect(() => {
    (async () => {
      try {
        const res = await AutopilotService.runWeeklyIfDue();
        if (res?.ran) await logEvent('autopilot.weekly_ran', res);
      } catch (e) {
        await logError('autopilot.weekly_failed', e);
      }
    })();
  }, []);
}
