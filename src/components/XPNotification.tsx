import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PALETTE, SPACING, TYPOGRAPHY, RADIUS, SHADOW } from '../ui/theme/tokens';

interface Props {
  visible: boolean;
  xp: number;
  reason: string;
  onHide: () => void;
}

export default function XPNotification({ visible, xp, reason, onHide }: Props): JSX.Element {
  const { top } = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide());
    }, 2500);
    return () => clearTimeout(timer);
    // opacity and translateY are Animated.Value refs — stable, intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, onHide]);

  if (!visible) return <></>;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: top + SPACING.lg },
        { opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.badge}>
        <Text style={styles.star}>⭐</Text>
        <Text style={styles.xpText}>+{xp} XP</Text>
      </View>
      <Text style={styles.reason} numberOfLines={1}>{reason}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: PALETTE.grey900,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
    zIndex: 9998,
    ...SHADOW.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.indigo600,
    borderRadius: RADIUS.full,
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  star: { fontSize: 12 },
  xpText: { ...TYPOGRAPHY.captionBold, color: PALETTE.white },
  reason: { ...TYPOGRAPHY.caption, color: PALETTE.grey300, maxWidth: 200 },
});
