import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportError } from '../../utils/reportError';

const XP_KEY = '@uandme/xp_state';
const XP_PER_LEVEL = 100;

interface XPState {
  total: number;
  level: number;
}

interface LevelData {
  level: number;
  title: string;
}

interface XPToast {
  visible: boolean;
  xp: number;
  reason: string;
}

interface LevelUp {
  visible: boolean;
  levelData: LevelData | null;
}

interface BootstrapXPResult {
  xpToast: XPToast;
  levelUp: LevelUp;
  awardXP: (amount: number, reason: string) => Promise<void>;
  hideXPToast: () => void;
  closeLevelUp: () => void;
}

const LEVEL_TITLES: Record<number, string> = {
  1: 'Getting Started',
  2: 'Calendar Novice',
  3: 'Time Keeper',
  4: 'Schedule Wizard',
  5: 'Calendar Master',
};

function getLevelTitle(level: number): string {
  return LEVEL_TITLES[level] ?? `Level ${level}`;
}

export default function useBootstrapXP(): BootstrapXPResult {
  const [xpState, setXPState] = useState<XPState>({ total: 0, level: 1 });
  const [xpToast, setXPToast] = useState<XPToast>({ visible: false, xp: 0, reason: '' });
  const [levelUp, setLevelUp] = useState<LevelUp>({ visible: false, levelData: null });

  useEffect(() => {
    AsyncStorage.getItem(XP_KEY)
      .then((v) => { if (v) setXPState(JSON.parse(v)); })
      .catch((e) => reportError('useBootstrapXP.load', e));
  }, []);

  // Use the functional form of setState so this callback never captures stale xpState.
  const awardXP = useCallback(async (amount: number, reason: string) => {
    try {
      let updatedState: XPState | null = null;
      let didLevelUp = false;

      setXPState((prev) => {
        const newTotal = prev.total + amount;
        const newLevel = Math.floor(newTotal / XP_PER_LEVEL) + 1;
        didLevelUp = newLevel > prev.level;
        updatedState = { total: newTotal, level: newLevel };
        return updatedState;
      });

      // Persist after the state update is queued; read from updatedState which
      // is set synchronously inside the updater above.
      if (updatedState) {
        await AsyncStorage.setItem(XP_KEY, JSON.stringify(updatedState));
      }

      setXPToast({ visible: true, xp: amount, reason });

      if (didLevelUp && updatedState) {
        const level = (updatedState as XPState).level;
        setLevelUp({ visible: true, levelData: { level, title: getLevelTitle(level) } });
      }
    } catch (e) {
      reportError('useBootstrapXP.award', e);
    }
  }, []);

  const hideXPToast = useCallback(() => setXPToast((t) => ({ ...t, visible: false })), []);
  const closeLevelUp = useCallback(() => setLevelUp({ visible: false, levelData: null }), []);

  return { xpToast, levelUp, awardXP, hideXPToast, closeLevelUp };
}
