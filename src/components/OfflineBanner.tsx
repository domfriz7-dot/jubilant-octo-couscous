import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PALETTE, SPACING, TYPOGRAPHY } from '../theme/tokens';

interface Props {
  visible: boolean;
  onRetry: () => void;
}

export default function OfflineBanner({ visible, onRetry }: Props): JSX.Element {
  const { top } = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -80,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
    // translateY is an Animated.Value ref — stable, intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Animated.View
      style={[styles.banner, { paddingTop: top + SPACING.sm, transform: [{ translateY }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text style={styles.text}>No internet connection</Text>
      <TouchableOpacity onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.retry}>Retry</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: PALETTE.grey800,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
    zIndex: 9999,
  },
  text: { ...TYPOGRAPHY.captionBold, color: PALETTE.white },
  retry: { ...TYPOGRAPHY.captionBold, color: PALETTE.indigo300, marginLeft: SPACING.md },
});
