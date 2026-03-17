import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Apple's core animation curve
const appleEase = Easing.bezier(0.25, 0.1, 0.25, 1.0);
// Slightly bouncier for content that should feel "alive"
const liveEase = Easing.bezier(0.34, 1.56, 0.64, 1);

export function FadeIn({
  children, delay = 0, duration = 380, slideDistance = 8,
  style, spring = false,
}: { children: React.ReactNode; delay?: number; duration?: number; spring?: boolean; style?: object }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slideDistance)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    const a = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, easing: appleEase, useNativeDriver: true }),
      spring
        ? Animated.spring(translateY, { toValue: 0, delay, tension: 100, friction: 12, useNativeDriver: true })
        : Animated.timing(translateY, { toValue: 0, duration, delay, easing: appleEase, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: duration * 0.8, delay, easing: appleEase, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [opacity, translateY, scale, delay, duration, spring]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }, { scale }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function FadeInScale({ children, delay = 0, duration = 350, style }: { children: React.ReactNode; delay?: number; duration?: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const a = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, easing: appleEase, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay, tension: 120, friction: 14, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [opacity, scale, delay, duration]);

  return (
    <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function StaggeredList({ children, stagger = 50, baseDelay = 0, ...fadeProps }: { children: React.ReactNode; stagger?: number; baseDelay?: number; [key: string]: unknown }) {
  const items = React.Children.toArray(children);
  return (
    <>
      {items.map((child: React.ReactNode, i: number) => (
        <FadeIn key={i} delay={baseDelay + i * stagger} {...fadeProps}>
          {child}
        </FadeIn>
      ))}
    </>
  );
}
