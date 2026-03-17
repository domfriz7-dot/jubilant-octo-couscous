import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE, EVENT_COLORS } from '../ui/theme/tokens';
import CalendarService, { CalendarEvent } from '../services/CalendarService';

type Nav = StackNavigationProp<RootStackParamList>;

interface UserGroup {
  userId: string;
  name: string;
  color: string;
  events: CalendarEvent[];
}

const MOCK_USERS: Record<string, { name: string; color: string }> = {
  u1: { name: 'Jordan', color: EVENT_COLORS[0] },
  u2: { name: 'Sam', color: EVENT_COLORS[2] },
};

export default function SharedScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const [groups, setGroups] = useState<UserGroup[]>([]);

  useEffect(() => {
    function build(events: CalendarEvent[]) {
      const map: Record<string, CalendarEvent[]> = {};
      for (const e of events) {
        for (const uid of e.sharedWith) {
          if (!map[uid]) map[uid] = [];
          map[uid].push(e);
        }
      }
      const result: UserGroup[] = Object.entries(map).map(([uid, evts]) => ({
        userId: uid,
        name: MOCK_USERS[uid]?.name ?? uid,
        color: MOCK_USERS[uid]?.color ?? EVENT_COLORS[0],
        events: evts.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
      }));
      setGroups(result);
    }

    build(CalendarService.getEvents());
    const unsub = CalendarService.subscribe(build);
    return unsub;
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      <LinearGradient
        colors={theme.gradient.primary}
        style={[styles.header, { paddingTop: top + SPACING.lg }]}
      >
        <Text style={styles.headerTitle}>Shared</Text>
        <Text style={styles.headerSub}>Events shared with your connections</Text>
      </LinearGradient>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.userId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🤝</Text>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No shared events yet</Text>
            <Text style={[styles.emptyBody, { color: theme.text.secondary }]}>
              When you share events with people, they'll appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.groupCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
            {/* User row */}
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: item.color }]}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text.primary }]}>{item.name}</Text>
                <Text style={[styles.userMeta, { color: theme.text.secondary }]}>
                  {item.events.length} shared {item.events.length === 1 ? 'event' : 'events'}
                </Text>
              </View>
            </View>
            {/* Events */}
            {item.events.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[styles.sharedEvent, { borderTopColor: theme.border.subtle }]}
                onPress={() => nav.navigate('EventDetails', { eventId: e.id })}
                activeOpacity={0.75}
              >
                <View style={[styles.eventDot, { backgroundColor: e.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: theme.text.primary }]} numberOfLines={1}>{e.title}</Text>
                  <Text style={[styles.eventMeta, { color: theme.text.secondary }]}>{e.date}  ·  {e.time}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.screen,
    paddingBottom: SPACING.xl,
    gap: SPACING.xs,
  },
  headerTitle: { ...TYPOGRAPHY.heading, color: PALETTE.white },
  headerSub: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.75)' },
  list: { padding: SPACING.screen, gap: SPACING.md, paddingBottom: 100 },
  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.md },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { ...TYPOGRAPHY.subheading },
  emptyBody: { ...TYPOGRAPHY.body, textAlign: 'center' },
  groupCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...TYPOGRAPHY.bodyBold, color: PALETTE.white },
  userInfo: { flex: 1 },
  userName: { ...TYPOGRAPHY.bodyBold },
  userMeta: { ...TYPOGRAPHY.caption, marginTop: 2 },
  sharedEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    gap: SPACING.md,
  },
  eventDot: { width: 8, height: 8, borderRadius: RADIUS.full },
  eventTitle: { ...TYPOGRAPHY.captionBold },
  eventMeta: { ...TYPOGRAPHY.label, marginTop: 1 },
});
