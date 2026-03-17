import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import XPService, { XP_REWARDS } from '../../services/XPService';
import { logError, logEvent } from '../../services/logger';
import { todayKey } from '../../utils/dateTime';

/**
 * Bootstrap XP initialization, baseline tracking, and toast/level-up UI triggers.
 *
 * @returns {{
 *   toast: { visible: boolean, message: string, delta: number } | null,
 *   levelUp: { visible: boolean, newLevel: number } | null,
 *   dismissToast: () => void,
 *   dismissLevelUp: () => void,
 * }}
 */
export default function useBootstrapXP() {
  const [xpToast, setXPToast] = useState({ visible: false, xp: 0, reason: '' });
  const [levelUp, setLevelUp] = useState({ visible: false, levelData: null });

  const lastHistoryTsRef = useRef(null);
  const lastLevelRef = useRef(null);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Initialize and set baseline immediately to avoid "first notify" surprises.
        const initData = await XPService.initialize();
        if (!alive || !initData) return;

        lastLevelRef.current = initData.currentLevel;
        lastHistoryTsRef.current = initData.history?.[0]?.timestamp || null;

        // Daily login XP (runs once per calendar day)
        const LAST_LOGIN_KEY = '@uandme_last_login';
        const lastLogin = await AsyncStorage.getItem(LAST_LOGIN_KEY);
        const today = todayKey();
        if (lastLogin !== today) {
          await AsyncStorage.setItem(LAST_LOGIN_KEY, today);
          await XPService.awardXP(XP_REWARDS.DAILY_LOGIN || 3, 'Daily login');
        }
      } catch (e) {
        await logError('XPBootstrapInitFailed', e);
      }
    })();

    const unsub = XPService.subscribe((data) => {
      if (!alive || !data) return;

      if (lastLevelRef.current == null) lastLevelRef.current = data.currentLevel;

      // XP toast on new history entry
      if (data.history?.[0]) {
        const latest = data.history[0] as { timestamp?: string; reason?: string; amount?: number };
        if (latest.timestamp !== lastHistoryTsRef.current) {
          lastHistoryTsRef.current = latest.timestamp;

          // Suppress "Daily login" toast on cold start to avoid noisy popups.
          const isColdStart = Date.now() - mountedAtRef.current < 4000;
          if (isColdStart && String(latest.reason || '').toLowerCase().includes('daily login')) {
            logEvent('XPToastSuppressed', { reason: latest.reason, amount: latest.amount });
          } else {
            setXPToast({ visible: true, xp: Number(latest.amount || 0), reason: String(latest.reason || '') });
          }
        }
      }

      // Level-up modal
      if (data.currentLevel > (lastLevelRef.current || 1)) {
        const info = XPService.getCurrentLevelInfo(data);
        setLevelUp({ visible: true, levelData: info.currentLevelData });
        lastLevelRef.current = data.currentLevel;
      } else {
        lastLevelRef.current = data.currentLevel;
      }
    });

    return () => {
      alive = false;
      unsub?.();
    };
  }, []);

  const hideXPToast = useCallback(() => {
    setXPToast({ visible: false, xp: 0, reason: '' });
  }, []);

  const closeLevelUp = useCallback(() => {
    setLevelUp({ visible: false, levelData: null });
  }, []);

  return { xpToast, levelUp, hideXPToast, closeLevelUp };
}
