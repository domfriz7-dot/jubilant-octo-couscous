import React from 'react';
import { View, StyleSheet, TextStyle } from 'react-native';
import AppText from './AppText';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';

type BadgeTone = 'neutral' | 'pro' | 'new' | 'beta' | 'danger' | 'success';

export default function Badge({ label, tone = 'neutral', style }: { label: string; tone?: BadgeTone; style?: object }) {
  const { theme } = useAppTheme();
  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.bg.subtle, fg: theme.text.secondary },
    pro: { bg: theme.accent.primary + tokens.opacity.tint.medium, fg: theme.accent.primary },
    new: { bg: theme.success + tokens.opacity.tint.medium, fg: theme.success },
    beta: { bg: theme.info + tokens.opacity.tint.medium, fg: theme.info },
    danger: { bg: theme.error + tokens.opacity.tint.medium, fg: theme.error },
    success: { bg: theme.success + tokens.opacity.tint.medium, fg: theme.success },
  };
  const c = map[tone];
  return (
    <View style={[s.base, { backgroundColor: c.bg }, style]}>
      <AppText style={[s.text, { color: c.fg }]} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  base: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: tokens.radius.pill, alignSelf: 'flex-start' },
  text: { fontSize: tokens.type.size.xxs, fontWeight: tokens.type.weight.bold as TextStyle['fontWeight'], letterSpacing: 0.4 },
});
