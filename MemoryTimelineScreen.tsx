import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View , RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import CalendarService from '../services/CalendarService';
import { logError } from '../services/logger';
import Screen from '../ui/components/Screen';
import SmartList from '../ui/components/SmartList';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Avatar from '../ui/components/Avatar';
import EmptyState from '../ui/components/EmptyState';
import LoadingState from '../ui/components/LoadingState';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { tokens } from '../config/tokens';
import { useUsers } from '../hooks/useUsers';
import { todayKey as todayKeyFn } from '../utils/dateTime';
import { getFirstName } from '../utils/partners';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';
import type { CalendarEvent } from '../types/calendar';

type Props = StackScreenProps<RootStackParamList, 'PlansTogether'>;

/**
 * PlansTogetherScreen
 *
 * Lists the actual shared plans (events) between the local user and a connection.
 * If no connectionId is provided, shows all shared plans across connections.
 *
 * Route params:
 *   - connectionId?: string
 */
export default function PlansTogetherScreen({ route, navigation }: Props) {
  const { theme } = useAppTheme();
  const { self, users, others } = useUsers();
  const connectionId = route?.params?.connectionId || null;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const evs = await CalendarService.getEvents();
      setEvents(Array.isArray(evs) ? evs : []);
    } catch (e) {
      logError('PlansTogetherScreen.load', e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      logError('PlansTogetherScreen.refresh', e);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);


  const { upcoming, past, title } = useMemo(() => {
    const todayKeyStr = todayKeyFn();

    const isSharedWithSomeone = (e: CalendarEvent) => {
      const participants = new Set([e.createdBy, ...(e.sharedWith || [])].filter(Boolean));
      if (!participants.has(self?.id)) return false;
      if (connectionId) return participants.has(connectionId);
      // Otherwise: shared with any other person
      return others.some((o) => participants.has(o.id));
    };

    const shared = events.filter(isSharedWithSomeone);

    const up = shared
      .filter((e: CalendarEvent) => e.date >= todayKeyStr)
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

    const pa = shared
      .filter((e: CalendarEvent) => e.date < todayKeyStr)
      .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    const name = connectionId ? getFirstName(users.find((u) => u.id === connectionId)?.name, 'them') : 'together';
    return { upcoming: up, past: pa, title: connectionId ? `Plans with ${name}` : 'Plans together' };
  }, [events, self?.id, connectionId, users, others]);

  const ensureHasPlansOrPrompt = useCallback(() => {
    if (upcoming.length + past.length > 0) return true;
    Alert.alert(
      'No plans yet',
      connectionId ? 'Do you want to plan something together?' : 'Do you want to plan something together with someone?',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Create plan', onPress: () => navigation.navigate('AddEvent', { selectedDate: todayKeyFn() }) },
        { text: 'Invite someone', onPress: () => navigation.navigate('MainTabs', { screen: 'Connections' }) },
      ]
    );
    return false;
  }, [upcoming.length, past.length, connectionId, navigation]);

  useEffect(() => {
    // If user navigated here explicitly (tap on "first plan"), show content; if empty, prompt.
    if (!loading) ensureHasPlansOrPrompt();
  }, [loading, ensureHasPlansOrPrompt]);

  const renderEventRow = (e: CalendarEvent, idx?: number) => {
    const participants = new Set([e.createdBy, ...(e.sharedWith || [])].filter(Boolean));
    const sharedUsers = users.filter((u) => u.id !== self?.id && participants.has(u.id));
    const when = e.time ? `${e.date} · ${e.time}` : e.date;

    return (
      <TouchableOpacity
        accessibilityRole="button"
        key={`${e.id}-${idx}`}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('EventDetails', { event: e })}
        style={{ marginBottom: 10 }}
      >
        <Card style={[s.row, { backgroundColor: theme.bg.card, ...tokens.shadow.sm }]}>
          <View style={s.rowCenter}>
            <View style={[s.dot, { backgroundColor: e.color || theme.accent.primary }]} />
            <View style={s.flex1}>
              <AppText variant="label" numberOfLines={1}>
                {e.title}
              </AppText>
              <AppText variant="caption" color="tertiary" style={s.mt2} numberOfLines={1}>
                {when}
                {e.durationMinutes ? ` · ${e.durationMinutes}m` : ''}
              </AppText>
            </View>

            {sharedUsers.length > 0 && (
              <View style={{ flexDirection: 'row', marginLeft: 10 }}>
                {sharedUsers.slice(0, 3).map((u, i: number) => (
                  <View key={u.id} style={{ marginLeft: i > 0 ? -6 : 0 }}>
                    <Avatar name={u.name} color={u.color} size={22} />
                  </View>
                ))}
                {sharedUsers.length > 3 && (
                  <View style={s.ml6}>
                    <AppText variant="caption" color="tertiary">
                      +{sharedUsers.length - 3}
                    </AppText>
                  </View>
                )}
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };
  const rows = useMemo(() => {
    const items: Array<{ key: string; type: 'header' | 'event' | 'emptyUpcoming' | 'emptyPast'; title?: string; icon?: string; event?: CalendarEvent }> = [];
    items.push({ key: 'header-upcoming', type: 'header', title: 'Upcoming', icon: 'calendar' });
    if (upcoming.length === 0) {
      items.push({ key: 'empty-upcoming', type: 'emptyUpcoming' });
    } else {
      upcoming.forEach((e: CalendarEvent) => items.push({ key: e.id, type: 'event', event: e }));
    }
    if (past.length > 0) {
      items.push({ key: 'header-past', type: 'header', title: 'Past', icon: 'clock' });
      past.forEach((e: CalendarEvent) => items.push({ key: e.id, type: 'event', event: e }));
    } else {
      items.push({ key: 'header-past', type: 'header', title: 'Past', icon: 'clock' });
      items.push({ key: 'empty-past', type: 'emptyPast' });
    }
    return items;
  }, [upcoming, past]);

  if (loading) {
    return (
      <Screen>
        <Header title={title} leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
        <LoadingState count={6} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={title} leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />

      <SmartList
          estimatedItemSize={96}
        data={rows}
        keyExtractor={(it) => String(it.key)}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={[s.sectionHeader, item.title === 'Past' ? { marginTop: 18 } : null]}>
                <Feather name={item.icon} size={14} color={theme.text.tertiary} />
                <AppText variant="caption" color="tertiary" style={s.ml8}>{item.title}</AppText>
              </View>
            );
          }
          if (item.type === 'emptyUpcoming') {
            return (
              <EmptyState
                title="Nothing scheduled"
                subtitle={connectionId ? "You don't have anything planned together yet." : "You don't have anything planned together yet."}
                actionLabel="Create plan"
                onAction={() => navigation.navigate('AddEvent', { selectedDate: todayKeyFn() })}
              />
            );
          }
          if (item.type === 'emptyPast') {
            return (
              <AppText variant="caption" color="tertiary" style={s.mt10}>
                No past plans yet.
              </AppText>
            );
          }
          return renderEventRow(item.event);
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 6 },
  row: { padding: 12, borderRadius: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  flex1: { flex: 1 },
  ml6: { marginLeft: 6 },
  ml8: { marginLeft: 8 },
  mt10: { marginTop: 10 },
  mt2: { marginTop: 2 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
});