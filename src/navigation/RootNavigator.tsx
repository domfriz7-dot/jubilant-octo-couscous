import React, { ComponentProps } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { TYPOGRAPHY } from '../ui/theme/tokens';

import HomeScreen from '../screens/main/HomeScreen';
import CalendarScreen from '../screens/main/CalendarScreen';
import TasksScreen from '../screens/main/TasksScreen';
import ConnectionsScreen from '../screens/main/ConnectionsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import EventDetailsScreen from '../screens/stack/EventDetailsScreen';
import AddEventScreen from '../screens/stack/AddEventScreen';
import WeeklyReportScreen from '../screens/stack/WeeklyReportScreen';

// ─── Tab Navigator ────────────────────────────────────────────────────────────

export type MainTabParamList = {
  Home: undefined;
  CalendarTab: undefined;
  Tasks: undefined;
  Connections: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs(): JSX.Element {
  const { theme, isDark } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.bg.card,
          borderTopColor: theme.border.default,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 58,
        },
        tabBarLabelStyle: {
          ...TYPOGRAPHY.label,
          marginBottom: 2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [IoniconsName, IoniconsName]> = {
            Home: ['home', 'home-outline'],
            CalendarTab: ['calendar', 'calendar-outline'],
            Tasks: ['checkmark-circle', 'checkmark-circle-outline'],
            Connections: ['people', 'people-outline'],
            Profile: ['person-circle', 'person-circle-outline'],
          };
          const [filled, outline] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <Ionicons
              name={focused ? filled : outline}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ tabBarLabel: 'Calendar' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ tabBarLabel: 'Tasks' }} />
      <Tab.Screen name="Connections" component={ConnectionsScreen} options={{ tabBarLabel: 'People' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── Root Stack ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  EventDetails: { eventId: string };
  AddEvent: { selectedDate?: string };
  WeeklyReport: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator(): JSX.Element {
  const { theme } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.bg.default },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
      <Stack.Screen
        name="AddEvent"
        component={AddEventScreen}
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
      <Stack.Screen
        name="WeeklyReport"
        component={WeeklyReportScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
}
