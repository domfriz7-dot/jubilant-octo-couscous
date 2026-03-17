import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import AppText from '../../ui/components/AppText';
import PressableScale from '../../ui/components/PressableScale';
import { tokens } from '../../config/tokens';

interface Props {
  vm: Record<string, unknown>;
  heroColor: string;
  wallpaper?: Record<string, unknown>;
  onPlanPress: () => void;
}

export default function HeroCard({ vm, heroColor, wallpaper, onPlanPress }: Props) {
  const { theme, isDark } = useAppTheme();

  // Subtle entrance animation
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1.0), useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  // Breathing glow animation for the icon
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // NOTE: React Native's Animated Easing API can differ across RN versions.
    // Some builds may not include Easing.sin which can crash at runtime when passed to timing().
    // Use a universally supported easing curve.
    const breatheEase = Easing.inOut(Easing.ease);
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, easing: breatheEase, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2500, easing: breatheEase, useNativeDriver: true }),
      ])
    ).start();
  }, [glowAnim]);

  const iconScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  const inner = (bg: React.ReactNode) => (
    <>
      <View style={s.heroRow}>
        <Animated.View style={[s.heroIcon, {
          backgroundColor: bg === 'wallpaper' ? 'rgba(255,255,255,0.18)' : heroColor + '14',
          transform: [{ scale: iconScale }],
        }]}>
          <Feather name={vm.hero.icon} size={22} color={bg === 'wallpaper' ? '#FFF' : heroColor} />
        </Animated.View>
        <View style={s.heroText}>
          <AppText style={[s.heroHeadline, bg === 'wallpaper' && { color: '#FFF' }]}>
            {vm.hero.headline}
          </AppText>
          {!!vm.hero.sub && (
            <AppText
              variant="bodySm"
              style={[s.heroSub, bg === 'wallpaper' ? { color: 'rgba(255,255,255,0.8)' } : {}]}
              color={bg !== 'wallpaper' ? 'secondary' : undefined}
            >
              {vm.hero.sub}
            </AppText>
          )}
          {!!vm.heroInsight && (
            <AppText
              variant="caption"
              style={[s.heroInsight, bg === 'wallpaper' ? { color: 'rgba(255,255,255,0.65)' } : {}]}
              color={bg !== 'wallpaper' ? 'tertiary' : undefined}
            >
              {vm.heroInsight}
            </AppText>
          )}
        </View>
      </View>
      <PressableScale
        onPress={onPlanPress}
        style={s.primaryCTA}
        accessibilityLabel="Plan something together"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={bg === 'wallpaper'
            ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.10)']
            : isDark ? ['#D4BBB0', '#B89485'] : ['#C49485', '#A97565']
          }
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.ctaGradient}
        >
          <View style={s.ctaIconWrap}>
            <Feather name="plus" size={14} color="#FFF" />
          </View>
          <AppText style={s.ctaText}>Plan something together</AppText>
        </LinearGradient>
      </PressableScale>
    </>
  );

  const cardContent = wallpaper?.colors ? (
    <LinearGradient
      colors={wallpaper.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.heroWrap, { padding: tokens.space.lg }]}
    >
      {inner('wallpaper')}
    </LinearGradient>
  ) : (
    <View style={[s.heroWrap, {
      backgroundColor: theme.bg.card,
      padding: tokens.space.lg,
      ...theme.shadow.md,
      ...(isDark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.divider } : {}),
    }]}>
      {inner('theme')}
    </View>
  );

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      {cardContent}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  heroWrap: { marginBottom: tokens.space.lg, borderRadius: tokens.radius.xxl, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroText: { marginLeft: 14, flex: 1 },
  heroHeadline: { fontSize: 19, fontWeight: '700', letterSpacing: -0.4, lineHeight: 24 },
  heroSub: { marginTop: 3 },
  heroInsight: { marginTop: 4 },
  primaryCTA: { marginTop: tokens.space.lg, borderRadius: tokens.radius.md, overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: tokens.radius.md,
  },
  ctaIconWrap: {
    width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ctaText: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.1 },
});
