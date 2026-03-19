import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import { haptics } from '../haptics';
import { tokens } from '../../config/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonProps = {
  title: string; onPress?: () => void; variant?: ButtonVariant;
  disabled?: boolean; loading?: boolean; size?: ButtonSize;
  icon?: React.ReactNode; style?: object; textStyle?: object;
};

export default function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, size = 'md', icon, style, textStyle }: ButtonProps) {
  const { theme, isDark } = useAppTheme();
  const bg = {
    primary: theme.accent.primary,
    secondary: isDark ? theme.bg.elevated : theme.bg.subtle,
    ghost: 'transparent',
    danger: theme.error,
  }[variant];
  const border = {
    primary: 'transparent',
    secondary: theme.divider || theme.border,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];
  const textColor = {
    primary: '#FFFFFF',
    secondary: theme.text.primary,
    ghost: theme.accent.primary,
    danger: '#FFFFFF',
  }[variant];
  const heights: Record<ButtonSize, number> = { sm: 44, md: 52, lg: 58 };

  const content = loading ? <ActivityIndicator color={textColor} size="small" /> : (
    <View style={st.content}>
      {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <AppText variant="label" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}
        style={[{ color: textColor, letterSpacing: 0.1 }, textStyle]}>{title}</AppText>
    </View>
  );

  // Primary gets a subtle gradient for depth
  if (variant === 'primary' && !disabled) {
    const gradStart = isDark ? '#D4BBB0' : '#C49485';
    const gradEnd = isDark ? '#B89485' : '#A97565';
    return (
      <TouchableOpacity
        onPress={() => { haptics.medium(); onPress?.(); }}
        disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={title}
        activeOpacity={0.75}
        style={[{ borderRadius: tokens.radius.md, overflow: 'hidden', opacity: disabled ? 0.38 : 1 }, style]}
      >
        <LinearGradient
          colors={[gradStart, gradEnd]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[st.base, { height: heights[size] }]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => { haptics.light(); onPress?.(); }}
      disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={title}
      style={[st.base, {
        backgroundColor: bg, borderColor: border, height: heights[size],
        opacity: disabled ? 0.38 : 1,
        ...(variant === 'secondary' ? {} : {}),
      }, style]}
      activeOpacity={0.65}
    >
      {content}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  base: {
    borderRadius: tokens.radius.md, paddingHorizontal: tokens.space.lg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent',
  },
  content: { flexDirection: 'row', alignItems: 'center' },
});
