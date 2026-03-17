import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import { tokens } from '../../config/tokens';

export default function SectionHeader({ label, linkText, onLinkPress, style }: { label: string; linkText?: string; onLinkPress?: () => void; style?: object }) {
  const { theme } = useAppTheme();
  return (
    <View style={[s.wrap, style]}>
      <AppText variant="tiny" style={[s.label, { color: theme.text.tertiary }]}>{label}</AppText>
      {!!linkText && !!onLinkPress && (
        <TouchableOpacity onPress={onLinkPress} activeOpacity={0.5} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <AppText variant="caption" style={{ color: theme.accent.primary, fontWeight: '600' }}>{linkText}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.md, paddingTop: tokens.space.xl },
  label: { flex: 1, letterSpacing: 1.0, fontWeight: '700', fontSize: 11 },
});
