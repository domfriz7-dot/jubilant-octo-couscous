import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type ScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Screen({ children, style }: ScreenProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.base, { backgroundColor: theme.bg.default }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ base: { flex: 1 } });
