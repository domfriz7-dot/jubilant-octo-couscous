import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_THEME, DARK_THEME, ThemeColors } from './tokens';

const THEME_KEY = '@uandme/theme_preference';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: LIGHT_THEME,
  isDark: false,
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Restore saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') {
          setPreferenceState(v);
        }
      })
      .catch(() => {});
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(THEME_KEY, p).catch(() => {});
  };

  const isDark = useMemo(() => {
    if (preference === 'dark') return true;
    if (preference === 'light') return false;
    return systemScheme === 'dark';
  }, [preference, systemScheme]);

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const value = useMemo(
    () => ({ theme, isDark, preference, setPreference }),
    [theme, isDark, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
