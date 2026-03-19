import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import Button from './Button';
import Icon from './Icon';
import { tokens } from '../../config/tokens';

export default function EmptyState({ icon, title, message, description, actionTitle, onAction, style }: { icon?: string; title: string; message?: string; description?: string; actionTitle?: string; onAction?: () => void; style?: object }) {
  const { theme, isDark } = useAppTheme();
  return (
    <View style={[s.wrap, style]}>
      <LinearGradient
        colors={isDark
          ? [theme.accent.primary + '15', theme.accent.primary + '08']
          : [theme.accent.light, theme.accent.primary + '08']
        }
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.iconWrap}
      >
        <Icon name={icon} size={28} color={theme.accent.primary} />
      </LinearGradient>
      <AppText variant="label" style={{ textAlign: 'center', marginTop: 20, fontSize: 17, letterSpacing: -0.2 }}>{title}</AppText>
      {!!(message || description) && (
        <AppText variant="bodySm" color="secondary" style={{ textAlign: 'center', marginTop: 10, maxWidth: 260, lineHeight: 20 }}>
          {message || description}
        </AppText>
      )}
      {!!actionTitle && !!onAction && (
        <Button title={actionTitle} onPress={onAction} size="sm" style={{ marginTop: 24, minWidth: 160 }} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingVertical: tokens.space.xxxl, paddingHorizontal: tokens.space.xl, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
