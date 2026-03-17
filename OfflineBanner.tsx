import React from 'react';
import { View, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import Icon from './Icon';
import { haptics } from '../haptics';
import { tokens } from '../../config/tokens';

type HeaderAction = {
  icon: string;
  label?: string;
  onPress?: () => void;
};

type HeaderProps = {
  title: string;
  subtitle?: string;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  style?: StyleProp<ViewStyle>;
  large?: boolean;
  transparent?: boolean;
};

try { require('expo-blur').BlurView; } catch { /* expo-blur not installed */ }

export default function Header({ title, subtitle, leftAction, rightAction, style, large, transparent }: HeaderProps) {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const ActionBtn = ({ action }: { action: HeaderAction }) => (
    <TouchableOpacity
      onPress={() => { haptics.light(); action.onPress?.(); }}
      style={[s.btn, {
        backgroundColor: isDark ? theme.bg.elevated : theme.glass.bg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? theme.divider : theme.glass.border,
      }]}
      activeOpacity={0.6}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={action.label || action.icon}
      accessibilityRole="button"
    >
      <Icon name={action.icon} size={18} color={theme.text.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 14, backgroundColor: transparent ? 'transparent' : theme.bg.default }, style]}
      accessibilityRole="header">
      <View style={s.row}>
        <View style={s.leftSlot}>{leftAction ? <ActionBtn action={leftAction} /> : null}</View>
        <View style={s.titleArea}>
          <AppText
            variant={large ? 'title' : 'heading'}
            numberOfLines={1}
            style={large ? s.titleLarge : undefined}
          >
            {title}
          </AppText>
          {!!subtitle && (
            <AppText variant="caption" color="secondary" numberOfLines={1} style={s.subtitle}>
              {subtitle}
            </AppText>
          )}
        </View>
        <View style={s.rightSlot}>{rightAction ? <ActionBtn action={rightAction} /> : null}</View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  leftSlot: { width: 44, marginRight: tokens.space.md },
  titleArea: { flex: 1, minWidth: 0 },
  titleLarge: { letterSpacing: -0.5 },
  subtitle: { marginTop: 4, letterSpacing: 0.1 },
  rightSlot: { width: 44, alignItems: 'flex-end', marginLeft: tokens.space.md },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});