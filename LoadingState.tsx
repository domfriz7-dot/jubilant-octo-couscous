import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Card from './Card';
import AppText from './AppText';
import { tokens } from '../../config/tokens';
import { useAppTheme } from '../theme/ThemeProvider';

type SettingSectionProps = {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function SettingSection({ title, children, style }: SettingSectionProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[s.wrap, style]}>
      <AppText variant="tiny" color="tertiary" style={{ marginBottom: tokens.space.sm, marginLeft: tokens.space.base }}>
        {title}
      </AppText>
      <Card style={[s.card, { backgroundColor: theme.bg.card }]}>
        {children}
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: tokens.space.lg },
  card: { padding: 0, overflow: 'hidden' },
});
