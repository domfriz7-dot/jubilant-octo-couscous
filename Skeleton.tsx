import React from 'react';
import { Image, Platform, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = {
  size?: number;
  variant?: 'mark' | 'wordmark' | 'full';
};

/**
 * Logo — the U&Me ampersand mark rendered as a native view.
 * Uses a warm clay gradient background with a white serif "&".
 * Renders identically on Android and iOS (no platform emoji issues).
 */
export function Logo({ size = 56, variant = 'mark' }: Props) {
  const { isDark } = useAppTheme();

  if (variant === 'wordmark' || variant === 'full') {
    const source = require('../../../assets/brand/uandme-wordmark.png');
    return (
      <Image
        source={source}
        style={{ width: Math.round(size * 3.2), height: size, resizeMode: 'contain' }}
        accessibilityLabel="U&Me"
      />
    );
  }

  const radius = Math.round(size * 0.28);
  const fontSize = Math.round(size * 0.48);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }]} accessibilityLabel="U&Me">
      <LinearGradient
        colors={isDark ? ['#C49A8A', '#8A6858'] : ['#C49485', '#A07060']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <Text
        style={{
          color: '#FFFFFFEB',
          fontSize,
          fontWeight: '700',
          fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
          lineHeight: fontSize,
          letterSpacing: -0.5,
          textAlign: 'center',
          ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
        }}
        allowFontScaling={false}
      >
        {'&'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Logo;
