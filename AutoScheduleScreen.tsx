import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image,  StyleSheet, TouchableOpacity, View, Alert , RefreshControl } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CalendarService from '../services/CalendarService';
import Screen from '../ui/components/Screen';
import SmartList from '../ui/components/SmartList';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import EmptyState from '../ui/components/EmptyState';
import LoadingState from '../ui/components/LoadingState';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { logError } from '../services/logger';
import { todayKey } from '../utils/dateTime';
import type { CalendarEvent } from '../types/calendar';
import { reportError } from '../utils/reportError';
import { getFirstName } from '../utils/partners';
type NavigationLike = { navigate: (screen: string, params?: Record<string, unknown>) => void; goBack?: () => void };
type ConnectionUser = { id: string; name?: string };


function formatDayHeader(isoDate: string): string {
  // isoDate: YYYY-MM-DD
  try {
    const d = new Date(isoDate + 'T00:00:00');
    // Example: Monday 9 February 2026
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch (e) { reportError('Screen.ConnectionEvents', e); return isoDate;
  }
}

function formatTimeLine(e: Partial<CalendarEvent>): string {
  const parts = [];
  if (e.time) parts.push(e.time);
  if (e.durationMinutes) parts.push(`${e.durationMinutes}m`);
  if (e.location) parts.push(e.location);
  return parts.join(' · ');
}

/**
 * ConnectionEventsScreen
 *
 * Drill-down list for connection tiles:
 *  - Upcoming events together
 *  - Past events together
 *
 * Route params:
 *   - user: { id, name, ... }
 *   - mode: 'upcoming' | 'past'
 */
export default function ConnectionEventsScreen({ route, navigation }: { route: { params?: { user?: ConnectionUser; mode?: 'upcoming'|'past' } }; navigation: NavigationLike }) {
  const { theme } = useAppTheme();
  const { user, mode } = route?.params || {};

  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
      setLoading(true);
      try { setAllEvents(await CalendarService.getEvents()); } catch (e) { reportError('Screen.ConnectionEvents', e); setAllEvents([]); }
      } catch (e) {
        try { logError('ConnectionEventsScreen.load', e); } catch (e) { reportError('Screen.ConnectionEvents', e); }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { rows, title } = useMemo(() => {
    const today = todayKey();
    const events = allEvents.filter((e: CalendarEvent) => (e.sharedWith?.includes(user.id) || e.createdBy === user.id));
    const filtered = mode === 'past' ? events.filter((e: CalendarEvent) => e.date < today) : events.filter((e: CalendarEvent) => e.date >= today);
    const sorted = filtered.sort((a, b) => {
      const A = a.date + (a.time || '');
      const B = b.date + (b.time || '');
      return mode === 'past' ? B.localeCompare(A) : A.localeCompare(B);
    });
    const firstName = getFirstName(user?.name, 'them');
    return {
      rows: sorted,
      title: mode === 'past' ? `Past plans with ${firstName}` : `Coming up with ${firstName}`,
    };
  }, [allEvents, user, mode]);

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    rows.forEach((e: CalendarEvent) => {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    const keys = Array.from(map.keys()).sort((a, b) => mode === 'past' ? b.localeCompare(a) : a.localeCompare(b));
    return keys.map((k: string) => ({ date: k, items: map.get(k) }));
  }, [rows, mode]);

  const pickPhoto = async (event: CalendarEvent) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to add a memory photo.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      await CalendarService.updateEvent(event.id, { photoUri: uri });
      setAllEvents(await CalendarService.getEvents());
    } catch (e) {
      logError('ConnectionEventsScreen.pickPhoto:', e);
      Alert.alert('Could not add photo', 'Try again.');
    }
  };
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setAllEvents(await CalendarService.getEvents());
    } catch (e) {
      reportError('Screen.ConnectionEvents.refresh', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const listRows = useMemo(() => {
    return grouped.flatMap(({ date, items }) => [
      { key: `header-${date}`, type: 'header' as const, date, event: null as CalendarEvent | null },
      ...items!.map((e) => ({ key: e.id, type: 'event' as const, date: null as string | null, event: e })),
    ]);
  }, [grouped]);

  const renderEvent = useCallback((e: CalendarEvent) => (
    <Card style={s.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        {e.icon ? <AppText style={{ fontSize: 18, marginRight: 8 }}>{e.icon}</AppText> : null}
        <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>{e.title}</AppText>
        <TouchableOpacity onPress={() => pickPhoto(e)} accessibilityLabel="Add photo" accessibilityRole="button">
          <AppText style={{ color: theme.accent.primary, fontSize: 12 }}>📷</AppText>
        </TouchableOpacity>
      </View>
      {formatTimeLine(e) ? (
        <AppText variant="caption" color="secondary">{formatTimeLine(e)}</AppText>
      ) : null}
      {e.description ? (
        <AppText variant="caption" color="tertiary" numberOfLines={2} style={{ marginTop: 2 }}>{e.description}</AppText>
      ) : null}
    </Card>
  ), [theme, pickPhoto]);

  if (loading) {
    return (
      <Screen>
        <Header title="Events" leftAction={{ icon: 'arrow-left', onPress: () => navigation.goBack?.() }} />
        <LoadingState count={4} />
      </Screen>
    );
  }

  if (listRows.length === 0) {
    return (
      <Screen>
        <Header title={title} leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
        <EmptyState
          icon="calendar"
          title="No plans found"
          description={mode === 'past' ? "You haven\'t done anything together yet." : "Nothing coming up — add a plan to get started."}
          actionTitle="Create plan"
          onAction={() => navigation.navigate('AddEvent', { selectedDate: todayKey() })}
          style={{ margin: 24 }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={title} leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
      <SmartList
        estimatedItemSize={84}
        data={listRows}
        keyExtractor={(it) => it.key}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} colors={[theme.accent.primary]} />}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <AppText variant="caption" color="tertiary" style={{ marginTop: 16, marginBottom: 6, fontWeight: '600' }}>
                {formatDayHeader(item.date!)}
              </AppText>
            );
          }
          return renderEvent(item.event!);
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  row: { padding: 12, borderRadius: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  thumb: { width: 54, height: 54, borderRadius: 12, overflow: 'hidden' },
});