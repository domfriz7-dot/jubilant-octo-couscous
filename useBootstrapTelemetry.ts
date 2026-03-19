import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from '../../services/logger';

export const USER_SETUP_KEY = '@uandme_user_setup_complete';

/**
 * Onboarding completion gate backed by AsyncStorage.
 *
 * @returns {{
 *   isOnboardingComplete: boolean | null,
 *   markComplete: () => Promise<void>
 * }}
 */
export default function useOnboardingGate() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(null);

  const withTimeout = async <T,>(p: Promise<T>, ms = 6000): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`AsyncStorage timeout after ${ms}ms`));
      }, ms);

      p.then((value) => {
        clearTimeout(timer);
        resolve(value);
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const completed = await withTimeout(AsyncStorage.getItem(USER_SETUP_KEY), 6000);
        if (!alive) return;
        setIsOnboardingComplete(completed === 'true');
      } catch {
        if (!alive) return;
        setIsOnboardingComplete(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const markComplete = useCallback(async () => {
    try { await AsyncStorage.setItem(USER_SETUP_KEY, 'true'); } catch (e) { logError('useOnboardingGate', e); }
    setIsOnboardingComplete(true);
  }, []);

  return { isOnboardingComplete, markComplete };
}
