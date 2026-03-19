import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useAppTheme } from '../theme/ThemeProvider';

const AC = Animated.createAnimatedComponent(Circle);

export default function ScoreRing({ value = 0, size = 72, stroke = 6, label, trackOpacity = 0.12, color, trackColor, gradientColors }: { value?: number; size?: number; stroke?: number; label?: string; trackOpacity?: number; color?: string; trackColor?: string; gradientColors?: [string, string] }) {
  const { theme } = useAppTheme();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue: pct, duration: 700, useNativeDriver: false }).start(); }, [pct, anim]);
  const dash = useMemo(() => anim.interpolate({ inputRange: [0, 100], outputRange: [c, 0] }), [anim, c]);
  const hasGrad = Array.isArray(gradientColors) && gradientColors.length >= 2;
  const sc = hasGrad ? 'url(#sg)' : (color || theme.accent?.primary || theme.text.primary);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotateZ: '-90deg' }, { scaleX: -1 }] }}>
        {hasGrad && <Defs><SvgGrad id="sg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={gradientColors[0]} /><Stop offset="1" stopColor={gradientColors[1]} /></SvgGrad></Defs>}
        <Circle cx={size/2} cy={size/2} r={r} stroke={trackColor || theme.text.secondary} strokeOpacity={trackOpacity} strokeWidth={stroke} fill="transparent" />
        <AC cx={size/2} cy={size/2} r={r} stroke={sc} strokeWidth={stroke} strokeLinecap="round" fill="transparent" strokeDasharray={`${c} ${c}`} strokeDashoffset={dash} />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Animated.Text style={{ color: theme.text.primary, fontSize: size > 64 ? 22 : 16, fontWeight: '700', letterSpacing: -0.5, lineHeight: size > 64 ? 24 : 18 }}>{Math.round(pct)}</Animated.Text>
          <Animated.Text style={{ marginLeft: 1, color: theme.text.tertiary, fontSize: size > 64 ? 11 : 9, fontWeight: '600', lineHeight: size > 64 ? 14 : 12, paddingBottom: 2 }}>%</Animated.Text>
        </View>
        {!!label && <Animated.Text numberOfLines={1} style={{ marginTop: 2, color: theme.text.secondary, fontSize: 10, fontWeight: '600', letterSpacing: 0.2 }}>{label}</Animated.Text>}
      </View>
    </View>
  );
}
