/**
 * ShimmerCard — premium loading state that replaces boring ActivityIndicator.
 * A card-shaped shimmer with content-aware skeleton layout.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';

interface Props {
  lines?: number;
  hasAvatar?: boolean;
  style?: object;
}

export default function ShimmerCard({ lines = 3, hasAvatar = false, style }: Props) {
  const { theme, isDark } = useAppTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breatheEase = Easing.inOut(Easing.ease);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, easing: breatheEase, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, easing: breatheEase, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  const bg = isDark ? theme.bg.elevated : theme.bg.subtle;

  return (
    <View style={[s.card, { backgroundColor: theme.bg.card, borderColor: theme.divider }, isDark && { borderWidth: StyleSheet.hairlineWidth }, style]}>
      {hasAvatar && (
        <View style={s.header}>
          <Animated.View style={[s.avatar, { backgroundColor: bg, opacity }]} />
          <View style={s.headerText}>
            <Animated.View style={[s.line, { width: '60%', backgroundColor: bg, opacity }]} />
            <Animated.View style={[s.lineSmall, { width: '40%', backgroundColor: bg, opacity, marginTop: 8 }]} />
          </View>
        </View>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            i === lines - 1 ? s.lineSmall : s.line,
            { width: i === lines - 1 ? '55%' : i === 0 ? '90%' : '75%', backgroundColor: bg, opacity, marginTop: i === 0 && !hasAvatar ? 0 : 10 },
          ]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: tokens.space.lg, borderRadius: tokens.radius.xl, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 16 },
  headerText: { flex: 1, marginLeft: 14 },
  line: { height: 14, borderRadius: 7 },
  lineSmall: { height: 10, borderRadius: 5 },
});
