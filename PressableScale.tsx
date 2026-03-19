/**
 * AnimatedNumber — smoothly interpolates between numeric values.
 * Used for score displays, counters, and stats that change.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, TextStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

interface Props {
  value: number;
  duration?: number;
  style?: TextStyle | TextStyle[];
  suffix?: string;
  prefix?: string;
}

export default function AnimatedNumber({ value, duration = 800, style, suffix = '', prefix = '' }: Props) {
  const { theme } = useAppTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const displayRef = useRef(0);

  useEffect(() => {
    anim.setValue(displayRef.current);
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: false,
    }).start();
    displayRef.current = value;
  }, [value, anim, duration]);

  // We can't use useNativeDriver with text, so we use a listener
  const [display, setDisplay] = React.useState(value);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => anim.removeListener(id);
  }, [anim]);

  return (
    <Animated.Text style={[{ color: theme.text.primary }, style]}>
      {prefix}{display}{suffix}
    </Animated.Text>
  );
}
