import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from './AppText';
import Icon from './Icon';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';
import { haptics } from '../haptics';

type SettingRowProps = {
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  disabled?: boolean;
};

export function SettingRow({ label, description, right, onPress, showChevron = false, disabled = false }: SettingRowProps) {
  const { theme } = useAppTheme();
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={[
        s.row,
        { borderBottomColor: theme.border, backgroundColor: theme.bg.card, opacity: disabled ? 0.5 : 1 },
      ]}
      onPress={disabled ? undefined : () => { haptics.light(); onPress?.(); }}
      activeOpacity={0.75}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
    >
      <View style={s.left}>
        <AppText variant="body" numberOfLines={1} style={s.label}>{label}</AppText>
        {!!description && (
          <AppText variant="caption" color="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
            {description}
          </AppText>
        )}
      </View>
      <View style={s.right}>
        {right}
        {showChevron ? <Icon name="chevron-right" size={18} color={theme.text.tertiary} style={{ marginLeft: tokens.space.sm }} /> : null}
      </View>
    </Container>
  );
}

const s = StyleSheet.create({
  row: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: { flex: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center' },
  label: { flexShrink: 1 },
});
