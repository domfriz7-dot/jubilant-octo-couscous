import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

/**
 * WrapRow
 *
 * React Native `gap` support (especially with `flexWrap: 'wrap'`) can be inconsistent across
 * iOS/Android builds. This component provides a stable, margin-based spacing strategy.
 *
 * - Works with arbitrary children (no need to wrap manually)
 * - Supports wrap + row layouts
 * - Prevents the common iOS "messy chip rows" issue
 */
export default function WrapRow({
  children,
  spacing = 8,
  style,
}: {
  children?: React.ReactNode;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const items = React.Children.toArray(children);

  return (
    <View
      style={[
        { flexDirection: 'row', flexWrap: 'wrap', marginRight: -spacing, marginBottom: -spacing },
        style,
      ]}
    >
      {items.map((child, idx) => (
        <View key={(child as { key?: string })?.key ?? `wrap-${idx}`} style={{ marginRight: spacing, marginBottom: spacing }}>
          {child as React.ReactNode}
        </View>
      ))}
    </View>
  );
}
