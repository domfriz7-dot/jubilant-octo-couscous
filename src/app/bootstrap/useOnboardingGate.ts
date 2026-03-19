import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@uandme/onboarding_complete';

interface OnboardingGate {
  /** null = loading, false = needs onboarding, true = done */
  isOnboardingComplete: boolean | null;
  markComplete: () => Promise<void>;
}

export default function useOnboardingGate(): OnboardingGate {
  const [isOnboardingComplete, setComplete] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setComplete(v === 'true'))
      .catch(() => setComplete(false));
  }, []);

  const markComplete = useCallback(async () => {
    await AsyncStorage.setItem(KEY, 'true');
    setComplete(true);
  }, []);

  return { isOnboardingComplete, markComplete };
}
