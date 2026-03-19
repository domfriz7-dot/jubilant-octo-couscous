import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import Icon from './Icon';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';

export default function Stat({ icon, value, label, variant = 'tile', color, style }: { icon: string; value: string | number; label: string; variant?: 'tile' | 'inline'; color?: string; style?: object }) {
  const { theme } = useAppTheme();
  const ic = color || theme.accent.primary;
  if (variant === 'inline') return (
    <View style={[s.inline, style]}>
      <View style={[s.iIcon, { backgroundColor: ic + '12' }]}><Icon name={icon} size={14} color={ic} /></View>
      <AppText variant="label" style={{ marginLeft: 10 }}>{String(value)}</AppText>
      <AppText variant="caption" color="secondary" style={{ marginLeft: 8 }}>{label}</AppText>
    </View>
  );
  return (
    <View style={[s.tile, { backgroundColor: theme.bg.card, borderColor: theme.divider || theme.border }, style]}>
      <View style={[s.tIcon, { backgroundColor: ic + '10' }]}><Icon name={icon} size={14} color={ic} /></View>
      <AppText style={s.tVal}>{String(value)}</AppText>
      <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>{label}</AppText>
    </View>
  );
}
const s = StyleSheet.create({
  tile: { flex: 1, borderWidth: 1, borderRadius: tokens.radius.md, paddingVertical: tokens.space.base, paddingHorizontal: tokens.space.md, alignItems: 'center' },
  tIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tVal: { fontSize: tokens.type.size.xl, fontWeight: tokens.type.weight.bold, letterSpacing: -0.3 },
  inline: { flexDirection: 'row', alignItems: 'center' },
  iIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
