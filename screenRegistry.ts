import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';

// expo-blur is optional — fallback to solid bg if not installed
let BlurView: React.ComponentType<{ tint: string; intensity: number; style: object }> | null = null;
try { BlurView = require('expo-blur').BlurView; } catch { /* expo-blur not installed */ }
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import AppText from '../ui/components/AppText';
import { lazyScreen } from './lazyScreen';
import { tabScreens } from './screenRegistry';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabDef = { name: keyof MainTabParamList; icon: string; label: string; Component: React.ComponentType<Record<string, unknown>> };

const TABS: TabDef[] = [
  { name: 'Home', icon: 'home', label: 'Home', Component: lazyScreen(tabScreens.Home) },
  { name: 'CalendarTab', icon: 'calendar', label: 'Calendar', Component: lazyScreen(tabScreens.CalendarTab) },
  { name: 'Connections', icon: 'users', label: 'People', Component: lazyScreen(tabScreens.Connections) },
  { name: 'Tasks', icon: 'check-square', label: 'Tasks', Component: lazyScreen(tabScreens.Tasks) },
  { name: 'Profile', icon: 'user', label: 'Profile', Component: lazyScreen(tabScreens.Profile) },
];

function TabIcon({ icon, label, focused, color }: { icon: string; label: string; focused: boolean; color: string }) {
  const { theme } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(iconScale, { toValue: focused ? 1.12 : 1, tension: 350, friction: 12, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, tension: 200, friction: 14, useNativeDriver: true }),
      ]),
    ]).start();
  }, [focused, scaleAnim, iconScale]);

  const pillOpacity = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const pillScale = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <View style={st.tab} accessibilityLabel={label}>
      <Animated.View style={[st.pill, {
        backgroundColor: theme.accent.primary + '10',
        opacity: pillOpacity,
        transform: [{ scaleX: pillScale }, { scaleY: pillScale }],
      }]} />
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Feather name={icon} size={21} color={color} />
      </Animated.View>
      <AppText numberOfLines={1} style={[st.label, {
        color,
        fontWeight: focused ? '600' : '400',
        opacity: focused ? 1 : 0.7,
      }]}>{label}</AppText>
    </View>
  );
}

export default function MainTabs() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const pad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.accent.primary,
      tabBarInactiveTintColor: theme.text.tertiary,
      animation: 'none',
      tabBarBackground: () => (
        Platform.OS === 'ios' && BlurView ? (
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={85}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? theme.bg.surface + 'F8' : theme.bg.surface + 'FA' }]} />
        )
      ),
      tabBarStyle: {
        position: 'absolute',
        backgroundColor: Platform.OS === 'ios' ? 'transparent' : undefined,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: isDark ? theme.divider : 'rgba(0,0,0,0.04)',
        height: 58 + pad,
        paddingBottom: pad,
        paddingTop: 5,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarItemStyle: { paddingVertical: 2 },
      tabBarIconStyle: { alignItems: 'center', justifyContent: 'center' },
      tabBarShowLabel: false,
    }}>
      {TABS.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={t.Component}
          options={{ tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => <TabIcon icon={t.icon} label={t.label} focused={focused} color={color} />, tabBarAccessibilityLabel: t.label }} />
      ))}
    </Tab.Navigator>
  );
}

const st = StyleSheet.create({
  tab: { width: 62, height: 46, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pill: { position: 'absolute', top: 0, width: 48, height: 30, borderRadius: 15 },
  label: { fontSize: 10, lineHeight: 12, letterSpacing: 0.1, marginTop: 1 },
});
