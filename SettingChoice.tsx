import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';

export default function Avatar({ name, color, uri, size = 44, onPress, editable, style }: { name?: string; color?: string; uri?: string; size?: number; onPress?: () => void; editable?: boolean; style?: object }) {
  const { theme } = useAppTheme();
  const radius = Math.round(size * 0.34);
  const fontSize = Math.round(size * 0.34);
  const baseColor = color || theme.accent.primary;

  // Derive a gradient from the base color
  const darken = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const b = Math.max(0, (num & 0x0000FF) - amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  const content = uri ? (
    <Image source={{ uri }} style={[s.img, { width: size, height: size, borderRadius: radius }]} />
  ) : (
    <LinearGradient
      colors={[baseColor, darken(baseColor, 30)]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[s.fallback, { width: size, height: size, borderRadius: radius }]}
    >
      <AppText style={{ color: '#FFF', fontWeight: '700', fontSize, letterSpacing: -0.5 }}>
        {(name || '?').charAt(0).toUpperCase()}
      </AppText>
    </LinearGradient>
  );

  if (onPress || editable) return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[s.wrap, style]}>
      {content}
      {editable && (
        <View style={[s.badge, { backgroundColor: theme.accent.primary, borderWidth: 2.5, borderColor: theme.bg.default }]}>
          <Feather name="camera" size={Math.round(size * 0.2)} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
  return <View style={[s.wrap, style]}>{content}</View>;
}

const s = StyleSheet.create({
  wrap: { position: 'relative' },
  img: { resizeMode: 'cover' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
