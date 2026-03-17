import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../../config/tokens';

/**
 * Centralized theme provider so screens/components don\'t each reinvent theme logic.
 * Source of truth: src/config/tokens.js
 *
 * Supports a persisted user preference:
 * - 'system' (default): follows OS appearance
 * - 'light': forced light
 * - 'dark': forced dark
 */
export type ThemeMode = "system" | "light" | "dark";
export type ThemeContextValue = {
  isDark: boolean;
  theme: Record<string, unknown>;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void> | void;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_PREFERENCE_KEY = '@uandme_theme_preference';

export function ThemeProvider({ children }: { children?: React.ReactNode }) {
  const systemIsDark = useColorScheme() === 'dark';
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system"); // 'system' | 'light' | 'dark'
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (alive && (saved === 'system' || saved === 'light' || saved === 'dark')) {
          setThemeModeState(saved);
        }
      } catch (e) {
        // Ignore - fall back to system
      } finally {
        if (alive) setIsReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    const next = mode === 'light' || mode === 'dark' ? mode : 'system';
    setThemeModeState(next);
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, next);
    } catch (e) {
      // ignore
      // Intentionally ignored — non-critical failure
    }
  }, []);

  const isDark = themeMode === 'system' ? systemIsDark : themeMode === 'dark';

  const value = useMemo(() => {
    const theme = getTheme(isDark);
    return { isDark, theme, themeMode, setThemeMode, isReady };
  }, [isDark, themeMode, setThemeMode, isReady]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return ctx as ThemeContextValue;
}
