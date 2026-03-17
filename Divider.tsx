import React, { useRef, useCallback } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { tokens } from '../../config/tokens';

/**
 * PressableScale — spring-physics tap feedback with premium feel.
 * 
 * Uses bouncy spring on press-in for a satisfying "push" feel,
 * gentle spring on release for smooth recovery, and a subtle
 * opacity shift for depth.
 */
export default function PressableScale({
  children, scaleValue = 0.975, style, onPress, onLongPress,
  activeOpacity = 1, disabled, hitSlop, accessibilityLabel,
  accessibilityRole, accessibilityState, accessibilityHint, testID, ...rest
}: { children: React.ReactNode; scaleValue?: number; style?: object; onPress?: () => void; onLongPress?: () => void; activeOpacity?: number; disabled?: boolean; hitSlop?: object; accessibilityLabel?: string; accessibilityRole?: string; accessibilityState?: object; accessibilityHint?: string; testID?: string; [key: string]: unknown }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const onIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: scaleValue,
        tension: 340,
        friction: 16,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.88,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity, scaleValue]);

  const onOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 180,
        friction: 14,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <TouchableOpacity
      onPress={onPress} onLongPress={onLongPress}
      onPressIn={onIn} onPressOut={onOut}
      activeOpacity={activeOpacity}
      disabled={disabled}
      hitSlop={hitSlop || { top: 4, bottom: 4, left: 4, right: 4 }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityHint={accessibilityHint}
      testID={testID}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
