import React from 'react';
import { Pressable, ViewStyle } from 'react-native';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
};

export default function IconButton({
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  hitSlop,
  style,
  children,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={hitSlop ?? { top: 10, bottom: 10, left: 12, right: 12 }}
      style={({ pressed }) => [
        style,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}
