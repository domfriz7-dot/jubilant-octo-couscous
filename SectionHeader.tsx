import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass' | 'premium';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  variant?: CardVariant;
};

export default function Card({ children, style, padded = true, variant = 'default' }: CardProps) {
  const { theme, isDark } = useAppTheme();
  const v: Record<CardVariant, ViewStyle> = {
    default:  { backgroundColor: theme.bg.surface, ...theme.shadow.sm },
    elevated: { backgroundColor: theme.bg.surface, ...theme.shadow.md },
    outlined: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.divider },
    glass:    { backgroundColor: theme.glass.bg, borderWidth: 1, borderColor: theme.glass.border },
    premium:  {
      backgroundColor: isDark ? theme.bg.elevated : theme.bg.surface,
      ...theme.shadow.md,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: isDark ? theme.divider : 'transparent',
    },
  };
  return (
    <View style={[
      styles.base,
      v[variant as CardVariant] || v.default,
      isDark && (variant === 'default' || variant === 'premium') && {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.divider,
      },
      padded && styles.padded,
      style,
    ]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: tokens.radius.xxl, overflow: 'hidden' },
  padded: { padding: 20 },
});
