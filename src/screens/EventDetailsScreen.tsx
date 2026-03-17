import React, { useState, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE, EVENT_COLORS } from '../ui/theme/tokens';
import CalendarService, { CalendarEvent } from '../services/CalendarService';

type RouteType = RouteProp<RootStackParamList, 'EventDetails'>;

const MOCK_USERS: Record<string, { name: string; color: string }> = {
  u1: { name: 'Jordan', color: EVENT_COLORS[0] },
  u2: { name: 'Sam', color: EVENT_COLORS[2] },
};

interface DetailRow {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}

export default function EventDetailsScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top, bottom } = useSafeAreaInsets();
  const nav = useNavigation<StackNavigationProp<RootStackParamList, 'EventDetails'>>();
  const { params } = useRoute<RouteType>();
  const [event, setEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const found = CalendarService.getEvents().find((e) => e.id === params.eventId) ?? null;
    setEvent(found);
    const unsub = CalendarService.subscribe((all) => {
      setEvent(all.find((e) => e.id === params.eventId) ?? null);
    });
    return unsub;
  }, [params.eventId]);

  const handleDelete = () => {
    Alert.alert('Delete event?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await CalendarService.deleteEvent(params.eventId);
          nav.goBack();
        },
      },
    ]);
  };

  if (!event) {
    return (
      <View style={[styles.notFound, { backgroundColor: theme.bg.default }]}>
        <Text style={[styles.notFoundText, { color: theme.text.secondary }]}>Event not found.</Text>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={[styles.backLink, { color: theme.text.accent }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rows: DetailRow[] = [
    { icon: 'calendar-outline', label: 'Date', value: event.date },
    { icon: 'time-outline', label: 'Time', value: event.time + (event.endTime ? ` – ${event.endTime}` : '') },
    ...(event.location ? [{ icon: 'location-outline' as const, label: 'Location', value: event.location }] : []),
    ...(event.description ? [{ icon: 'document-text-outline' as const, label: 'Notes', value: event.description }] : []),
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      {/* Hero */}
      <LinearGradient
        colors={[event.color, adjustColor(event.color)]}
        style={[styles.hero, { paddingTop: top + SPACING.lg }]}
      >
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-down" size={24} color={PALETTE.white} />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{event.title}</Text>
          <Text style={styles.heroDate}>{event.date}  ·  {event.time}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottom + SPACING.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Detail rows */}
        <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
          {rows.map((row, i) => (
            <React.Fragment key={row.label}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />}
              <View style={styles.detailRow}>
                <View style={[styles.iconWrap, { backgroundColor: theme.bg.elevated }]}>
                  <Ionicons name={row.icon} size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>{row.label}</Text>
                  <Text style={[styles.detailValue, { color: theme.text.primary }]}>{row.value}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Shared with */}
        {event.sharedWith.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>Shared with</Text>
            <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
              {event.sharedWith.map((uid, i) => {
                const user = MOCK_USERS[uid];
                if (!user) return null;
                return (
                  <React.Fragment key={uid}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />}
                    <View style={styles.detailRow}>
                      <View style={[styles.avatar, { backgroundColor: user.color }]}>
                        <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                      </View>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>{user.name}</Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}

        {/* Delete */}
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: theme.danger }]}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color={theme.danger} />
          <Text style={[styles.deleteText, { color: theme.danger }]}>Delete event</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/** Darken a hex colour slightly for gradient effect. */
function adjustColor(hex: string): string {
  try {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - 30);
    const g = Math.max(0, ((n >> 8) & 0xff) - 30);
    const b = Math.max(0, (n & 0xff) - 30);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return hex;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  notFoundText: { ...TYPOGRAPHY.body },
  backLink: { ...TYPOGRAPHY.bodyBold },
  hero: {
    paddingHorizontal: SPACING.screen,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { gap: SPACING.xs },
  heroTitle: { ...TYPOGRAPHY.title, color: PALETTE.white },
  heroDate: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.8)' },
  body: { padding: SPACING.screen, gap: SPACING.lg },
  card: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.md, gap: SPACING.md },
  iconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { ...TYPOGRAPHY.label, marginBottom: 2 },
  detailValue: { ...TYPOGRAPHY.body },
  divider: { height: 1, marginLeft: SPACING.md + 36 + SPACING.md },
  sectionTitle: { ...TYPOGRAPHY.label, marginBottom: -SPACING.sm },
  avatar: { width: 36, height: 36, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...TYPOGRAPHY.bodyBold, color: PALETTE.white },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  deleteText: { ...TYPOGRAPHY.bodyBold },
});
