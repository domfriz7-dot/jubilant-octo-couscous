import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE } from '../../ui/theme/tokens';
import CalendarService, { CalendarEvent } from '../../services/CalendarService';
import { getConnectionByUid } from '../../services/ConnectionsService';
import { getUserId } from '../../services/IdentityService';

type Nav = StackNavigationProp<RootStackParamList>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning 👋';
  if (h < 17) return 'Good afternoon 👋';
  return 'Good evening 👋';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    setEvents(CalendarService.getEventsForDate(todayStr()));
    // Re-evaluate todayStr() on every update so the list stays correct
    // if the app remains open past midnight.
    const unsub = CalendarService.subscribe((all) =>
      setEvents(all.filter((e) => e.date === todayStr()))
    );
    return unsub;
  }, []);

  const openEvent = useCallback(
    (id: string) => nav.navigate('EventDetails', { eventId: id }),
    [nav]
  );

  const openAdd = useCallback(
    () => nav.navigate('AddEvent', { selectedDate: todayStr() }),
    [nav]
  );

  const upcoming = CalendarService.getUpcomingEvents(5);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      {/* Header */}
      <LinearGradient
        colors={theme.gradient.primary}
        style={[styles.header, { paddingTop: top + SPACING.lg }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View>
          <Text style={styles.headerSub}>{getGreeting()}</Text>
          <Text style={styles.headerDate}>{formatDate(new Date())}</Text>
        </View>
        <TouchableOpacity
          onPress={openAdd}
          style={styles.addBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Add event"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={26} color={PALETTE.white} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Today's count */}
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Today · {events.length} {events.length === 1 ? 'event' : 'events'}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Nothing today</Text>
            <Text style={[styles.emptyBody, { color: theme.text.secondary }]}>
              Tap + to add your first event for today.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isShared = item.createdBy !== getUserId();
          const fromName = isShared ? (getConnectionByUid(item.createdBy)?.name ?? null) : null;
          return (
            <TouchableOpacity
              style={[styles.eventCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}
              onPress={() => openEvent(item.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.colorBar, { backgroundColor: item.color }]} />
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: theme.text.primary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.eventMeta, { color: theme.text.secondary }]}>
                  {item.time}{item.endTime ? ` – ${item.endTime}` : ''}
                  {item.location ? `  ·  ${item.location}` : ''}
                  {fromName ? `  ·  from ${fromName}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          upcoming.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: SPACING.xl }]}>
                Coming up
              </Text>
              {upcoming.map((item) => {
                const isShared = item.createdBy !== getUserId();
                const fromName = isShared ? (getConnectionByUid(item.createdBy)?.name ?? null) : null;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.eventCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}
                    onPress={() => openEvent(item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.colorBar, { backgroundColor: item.color }]} />
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: theme.text.primary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.eventMeta, { color: theme.text.secondary }]}>
                        {item.date}  ·  {item.time}
                        {fromName ? `  ·  from ${fromName}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.text.tertiary} />
                  </TouchableOpacity>
                );
              })}
            </>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.8}>
        <LinearGradient colors={theme.gradient.primary} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={PALETTE.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screen,
    paddingBottom: SPACING.xl,
  },
  headerSub: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.75)' },
  headerDate: { ...TYPOGRAPHY.subheading, color: PALETTE.white },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: SPACING.screen, paddingBottom: 100 },
  sectionTitle: { ...TYPOGRAPHY.subheading, marginBottom: SPACING.md },
  emptyCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    padding: SPACING.xxxl,
    gap: SPACING.sm,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { ...TYPOGRAPHY.subheading },
  emptyBody: { ...TYPOGRAPHY.body, textAlign: 'center' },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  eventInfo: { flex: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  eventTitle: { ...TYPOGRAPHY.bodyBold, marginBottom: 2 },
  eventMeta: { ...TYPOGRAPHY.caption },
  fab: {
    position: 'absolute',
    bottom: SPACING.xxxl,
    right: SPACING.xl,
    ...SHADOW.lg,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
