import NotificationService from './NotificationService';
import { reportError } from '../utils/reportError';

const NudgeService = {
  async scheduleNudgeNotification(): Promise<void> {
    try {
      // Schedule a gentle nudge for 3 days from now if no activity
      const trigger = {
        seconds: 60 * 60 * 24 * 3, // 3 days
        repeats: false,
      } as const;
      await NotificationService.scheduleLocalNotification(
        "Haven't seen you in a while 👋",
        'Check what your people are up to today.',
        { kind: 'nudge' },
        trigger
      );
    } catch (e) {
      reportError('NudgeService', e);
    }
  },
};

export default NudgeService;
