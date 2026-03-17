import React, { memo, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import AppText from '../../ui/components/AppText';
import PressableScale from '../../ui/components/PressableScale';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { haptics } from '../../ui/haptics';
import { tokens } from '../../config/tokens';

const PRESETS = [
  { emoji: '☕', label: 'Coffee', time: '10:00', duration: 30, color: '#C49485' },
  { emoji: '🍽️', label: 'Dinner', time: '19:00', duration: 90, color: '#D9A566' },
  { emoji: '🎬', label: 'Movie', time: '20:00', duration: 120, color: '#7B93B3' },
  { emoji: '🏃', label: 'Walk', time: '17:30', duration: 45, color: '#6B9B7F' },
];

interface Props {
  onSelect: (preset: { emoji: string; label: string; time: string; duration: number }) => void;
}

const QuickAddPresets = memo(function QuickAddPresets({ onSelect }: Props) {
  const { theme, isDark } = useAppTheme();

  return (
    <View style={s.container}>
      <AppText variant="tiny" style={{ color: theme.text.tertiary, marginBottom: 10 }}>QUICK PLAN</AppText>
      <View style={s.row}>
        {PRESETS.map((p, i) => (
          <PresetChip
            key={p.label}
            preset={p}
            index={i}
            onSelect={onSelect}
            theme={theme}
            isDark={isDark}
          />
        ))}
      </View>
    </View>
  );
});

const PresetChip = memo(function PresetChip({ preset, index, onSelect, theme, isDark }: { preset: { emoji: string; label: string; time: string; duration: number; color: string }; index: number; onSelect: (p: unknown) => void; theme: Record<string, unknown>; isDark: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 60, easing: Easing.bezier(0.25, 0.1, 0.25, 1.0), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 60, easing: Easing.bezier(0.25, 0.1, 0.25, 1.0), useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <PressableScale
        onPress={() => { haptics.light(); onSelect(preset); }}
        style={[s.chip, {
          backgroundColor: isDark ? theme.bg.elevated : theme.bg.card,
          borderColor: preset.color + '20',
          ...theme.shadow.sm,
        }]}
        accessibilityLabel={`Quick add ${preset.label}`}
      >
        <AppText style={{ fontSize: 22 }}>{preset.emoji}</AppText>
        <AppText variant="caption" style={{ marginTop: 4, fontWeight: '600', letterSpacing: 0.1 }}>{preset.label}</AppText>
      </PressableScale>
    </Animated.View>
  );
});

export default QuickAddPresets;

const s = StyleSheet.create({
  container: { marginBottom: tokens.space.lg },
  row: { flexDirection: 'row', gap: 10 },
  chip: {
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 6,
    borderRadius: tokens.radius.xl, borderWidth: 1,
  },
});
