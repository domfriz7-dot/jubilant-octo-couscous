import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PALETTE, SPACING, TYPOGRAPHY, RADIUS } from '../ui/theme/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

interface Slide {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  gradient: [string, string];
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    emoji: '👋',
    title: 'Welcome to U&Me',
    subtitle: 'Stay in sync with the people who matter most. Share moments, plans, and memories.',
    gradient: [PALETTE.indigo600, PALETTE.purple600],
  },
  {
    key: 'calendar',
    emoji: '📅',
    title: 'Shared Calendars',
    subtitle: 'Create events and instantly share them with friends, family, or your partner.',
    gradient: [PALETTE.purple600, '#9333ea'],
  },
  {
    key: 'connect',
    emoji: '🤝',
    title: 'Stay Connected',
    subtitle: 'See what your people are up to and never miss the moments that matter.',
    gradient: ['#0EA5E9', PALETTE.indigo600],
  },
  {
    key: 'ready',
    emoji: '🚀',
    title: "You're All Set",
    subtitle: "Let's start building memories together.",
    gradient: [PALETTE.green500, PALETTE.indigo600],
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props): JSX.Element {
  const { bottom } = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setActiveIndex(first.index);
    }
  ).current;

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      onComplete();
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <LinearGradient
            colors={item.gradient}
            style={styles.slide}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </LinearGradient>
        )}
      />

      {/* Pagination dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
          const width = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[styles.dot, { width, opacity }]} />
          );
        })}
      </View>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: bottom + SPACING.xl }]}>
        <TouchableOpacity style={styles.button} onPress={goNext} activeOpacity={0.8}>
          <Text style={styles.buttonText}>
            {isLast ? "Let's go!" : 'Next'}
          </Text>
        </TouchableOpacity>
        {!isLast && (
          <TouchableOpacity onPress={onComplete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.dark400 },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
    gap: SPACING.lg,
  },
  emoji: { fontSize: 72, marginBottom: SPACING.md },
  title: {
    ...TYPOGRAPHY.hero,
    color: PALETTE.white,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
    backgroundColor: PALETTE.dark400,
  },
  dot: {
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: PALETTE.indigo300,
  },
  footer: {
    backgroundColor: PALETTE.dark400,
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.screen,
  },
  button: {
    width: '100%',
    backgroundColor: PALETTE.indigo600,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  buttonText: { ...TYPOGRAPHY.bodyBold, color: PALETTE.white },
  skip: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.5)' },
});
