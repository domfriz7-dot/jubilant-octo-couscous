import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import AppText from '../../ui/components/AppText';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { tokens } from '../../config/tokens';

interface Props {
  partnerName: string;
  pulse: { emoji: string; label: string } | null;
}

/**
 * Shows partner's latest pulse on the home screen.
 * Beautiful subtle gradient border with a breathing emoji.
 */
export default function PartnerPulseCard({ partnerName, pulse }: Props) {
  const { theme, isDark } = useAppTheme();
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    const breatheEase = Easing.inOut(Easing.ease);
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2000, easing: breatheEase, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2000, easing: breatheEase, useNativeDriver: true }),
      ])
    ).start();
  }, [breathe, pulse]);

  if (!pulse) return null;

  const emojiScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  return (
    <View style={[s.container, {
      backgroundColor: isDark ? theme.accent.primary + '08' : theme.accent.primary + '05',
      borderColor: theme.accent.primary + '18',
    }]}>
      <Animated.View style={[s.emojiWrap, {
        backgroundColor: theme.accent.primary + '10',
        transform: [{ scale: emojiScale }],
      }]}>
        <AppText style={{ fontSize: 20 }}>{pulse.emoji}</AppText>
      </Animated.View>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <AppText variant="bodySm" style={{ fontWeight: '600' }}>
          {partnerName} is feeling {pulse.label.toLowerCase()}
        </AppText>
        <AppText variant="caption" color="tertiary" style={{ marginTop: 2 }}>
          Their latest check-in
        </AppText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.base,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    marginBottom: tokens.space.md,
  },
  emojiWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
});
