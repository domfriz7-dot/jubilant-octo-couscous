import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE, ThemeColors } from '../../ui/theme/tokens';
import CalendarService from '../../services/CalendarService';

function getWeekRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - day);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const label = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  return { start: fmt(startDate), end: fmt(endDate), label };
}

export default function WeeklyReportScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top, bottom } = useSafeAreaInsets();
  const nav = useNavigation<StackNavigationProp<RootStackParamList, 'WeeklyReport'>>();

  const { start, end, label } = getWeekRange();
  const events = useMemo(() => {
    return CalendarService.getEvents().filter((e) => e.date >= start && e.date <= end);
  }, [start, end]);

  const totalEvents = events.length;
  const sharedCount = events.filter((e) => e.sharedWith.length > 0).length;
  const colorCounts: Record<string, number> = {};
  for (const e of events) colorCounts[e.color] = (colorCounts[e.color] ?? 0) + 1;

  const topColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? theme.primary;

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    return events.filter((e) => e.date === ds).length;
  });
  const maxDay = Math.max(...byDay, 1);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottom + SPACING.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={theme.gradient.primary}
          style={[styles.header, { paddingTop: top + SPACING.lg }]}
        >
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={PALETTE.white} />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>Weekly Report</Text>
          <Text style={styles.headerWeek}>{label}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Stat cards */}
          <View style={styles.statsRow}>
            <StatCard
              theme={theme}
              emoji="📅"
              value={totalEvents}
              label="Events"
            />
            <StatCard
              theme={theme}
              emoji="🤝"
              value={sharedCount}
              label="Shared"
            />
            <StatCard
              theme={theme}
              emoji="📊"
              value={Math.round((sharedCount / Math.max(totalEvents, 1)) * 100)}
              label="Share %"
              suffix="%"
            />
          </View>

          {/* Bar chart */}
          <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Events by day</Text>
            <View style={styles.barChart}>
              {byDay.map((count, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { backgroundColor: theme.primary, height: `${(count / maxDay) * 100}%`, opacity: count === 0 ? 0.15 : 1 },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: theme.text.secondary }]}>{dayLabels[i]}</Text>
                  {count > 0 && (
                    <Text style={[styles.barCount, { color: theme.text.tertiary }]}>{count}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Upcoming events */}
          {events.length > 0 ? (
            <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>This week</Text>
              {events.slice(0, 8).map((e, i) => (
                <React.Fragment key={e.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />}
                  <View style={styles.eventRow}>
                    <View style={[styles.colorDot, { backgroundColor: e.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, { color: theme.text.primary }]} numberOfLines={1}>{e.title}</Text>
                      <Text style={[styles.eventMeta, { color: theme.text.secondary }]}>{e.date}  ·  {e.time}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}>
              <Text style={styles.emptyEmoji}>🌟</Text>
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No events this week yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ theme, emoji, value, label, suffix = '' }: {
  theme: ThemeColors;
  emoji: string;
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color: theme.text.primary }]}>{value}{suffix}</Text>
      <Text style={[styles.statLabel, { color: theme.text.secondary }]}>{label}</Text>
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
  backBtn: { alignSelf: 'flex-start', marginBottom: SPACING.sm },
  headerLabel: { ...TYPOGRAPHY.label, color: 'rgba(255,255,255,0.7)' },
  headerWeek: { ...TYPOGRAPHY.heading, color: PALETTE.white },
  body: { padding: SPACING.screen, gap: SPACING.lg },
  statsRow: { flexDirection: 'row', gap: SPACING.md },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: 2,
  },
  statEmoji: { fontSize: 24, marginBottom: SPACING.xs },
  statValue: { ...TYPOGRAPHY.title },
  statLabel: { ...TYPOGRAPHY.label },
  card: { borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.lg, overflow: 'hidden' },
  cardTitle: { ...TYPOGRAPHY.subheading, marginBottom: SPACING.md },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: SPACING.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 2 },
  barTrack: { flex: 1, width: '80%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: RADIUS.sm },
  barLabel: { ...TYPOGRAPHY.label },
  barCount: { ...TYPOGRAPHY.label },
  divider: { height: 1, marginVertical: 0 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.md },
  colorDot: { width: 10, height: 10, borderRadius: RADIUS.full },
  eventTitle: { ...TYPOGRAPHY.captionBold },
  eventMeta: { ...TYPOGRAPHY.label, marginTop: 2 },
  emptyCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyEmoji: { fontSize: 36 },
  emptyText: { ...TYPOGRAPHY.body },
});
