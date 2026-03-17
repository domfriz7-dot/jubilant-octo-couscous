/**
 * GlassCard — frosted glass effect card for premium sections.
 * 
 * Uses expo-blur on iOS for true glassmorphism,
 * falls back to a subtle translucent background on Android.
 */
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';

let BlurView: React.ComponentType<{ tint: string; intensity: number; style: object }> | null = null;
try { BlurView = require('expo-blur').BlurView; } catch { /* expo-blur not installed */ }

interface Props {
  children: React.ReactNode;
  intensity?: number;
  style?: object;
  padded?: boolean;
}

export default function GlassCard({ children, intensity = 60, style, padded = true }: Props) {
  const { theme, isDark } = useAppTheme();

  if (Platform.OS === 'ios' && BlurView) {
    return (
      <View style={[s.base, style]}>
        <BlurView
          tint={isDark ? 'dark' : 'light'}
          intensity={intensity}
          style={StyleSheet.absoluteFill}
        />
        <View style={[
          s.overlay,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)' },
          padded && s.padded,
        ]}>
          {children}
        </View>
      </View>
    );
  }

  // Android fallback: translucent card
  return (
    <View style={[
      s.base,
      {
        backgroundColor: isDark ? 'rgba(28,27,25,0.85)' : 'rgba(255,255,255,0.82)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      },
      padded && s.padded,
      style,
    ]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  base: { borderRadius: tokens.radius.xl, overflow: 'hidden' },
  overlay: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)', borderRadius: tokens.radius.xl },
  padded: { padding: tokens.space.lg },
});