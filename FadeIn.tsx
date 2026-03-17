import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import { tokens } from '../../config/tokens';

export default function Divider({ label, style }: { label?: string; style?: object }) {
  const { theme } = useAppTheme();
  if (label) return (
    <View style={[s.labelWrap, style]}>
      <View style={[s.line, { backgroundColor: theme.divider }]} />
      <AppText variant="caption" color="tertiary" style={{ paddingHorizontal: tokens.space.md, letterSpacing: 0.5 }}>{label}</AppText>
      <View style={[s.line, { backgroundColor: theme.divider }]} />
    </View>
  );
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.divider, marginVertical: tokens.space.md }, style]} />;
}
const s = StyleSheet.create({
  labelWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: tokens.space.lg },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
