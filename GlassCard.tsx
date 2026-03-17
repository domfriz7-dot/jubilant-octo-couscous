import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';

/**
 * Skeleton shimmer — premium animated placeholder.
 * Uses a smooth sine wave with a subtle scale pulse for organic feel.
 */
export default function Skeleton({ width = '100%', height = 16, radius, circle, size, style }: { width?: string | number; height?: number; radius?: number; circle?: boolean; size?: number; style?: object }) {
  const { theme } = useAppTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breatheEase = Easing.inOut(Easing.ease);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, easing: breatheEase, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, easing: breatheEase, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });
  const scaleX = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.01, 1] });
  const w = circle ? size || 40 : width;
  const h = circle ? size || 40 : height;
  const r = circle ? (size || 40) / 2 : (radius ?? tokens.radius.sm);

  return (
    <Animated.View
      style={[
        { width: w, height: h, borderRadius: r, backgroundColor: theme.bg.subtle, opacity, transform: [{ scaleX }] },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: object }) {
  return (
    <View style={[skel.card, style]}>
      <View style={skel.row}>
        <Skeleton circle size={48} />
        <View style={skel.textBlock}>
          <Skeleton width={140} height={14} radius={7} />
          <Skeleton width={200} height={12} radius={6} style={{ marginTop: 10 }} />
        </View>
      </View>
      <Skeleton width="100%" height={48} radius={tokens.radius.md} style={{ marginTop: 20 }} />
    </View>
  );
}

export function SkeletonRow({ style }: { style?: object }) {
  return (
    <View style={[skel.rowItem, style]}>
      <Skeleton circle size={28} />
      <Skeleton width={120} height={12} radius={6} style={{ marginLeft: 12 }} />
      <View style={{ flex: 1 }} />
      <Skeleton width={48} height={4} radius={2} />
    </View>
  );
}

export function SkeletonPulse({ style }: { style?: object }) {
  return (
    <View style={[skel.pulse, style]}>
      <Skeleton width={80} height={10} radius={5} style={{ marginBottom: 10 }} />
      <Skeleton width="80%" height={14} radius={7} style={{ marginBottom: 18 }} />
      <View style={skel.pulseRow}>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} circle size={40} />
        ))}
      </View>
    </View>
  );
}

const skel = StyleSheet.create({
  card: { padding: 20, borderRadius: tokens.radius.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  textBlock: { marginLeft: 14, flex: 1 },
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  pulse: { padding: 20, borderRadius: tokens.radius.lg },
  pulseRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
