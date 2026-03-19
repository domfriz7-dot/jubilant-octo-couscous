import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { ScrollView, StyleSheet, View  } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CalendarService from '../services/CalendarService';
import AccountabilityService from '../services/AccountabilityService';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import LoadingState from '../ui/components/LoadingState';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { tokens } from '../config/tokens';
import { calculateBondStrength } from '../insights';
import { logError } from '../services/logger';
import DailyRitualService from '../services/DailyRitualService';
import { todayKey as todayKeyFn } from '../utils/dateTime';
import { reportError } from '../utils/reportError';
import { getFirstName } from '../utils/partners';

/**
 * BondBreakdownScreen
 *
 * Shows how "bond strength" is calculated, transparently.
 *
 * Route params:
 *   - user: { id, name, ... }
 */
const ComponentBar = memo(function ComponentBar({ comp, theme }: { comp: { label: string; value: number; color?: string }; theme: Record<string, unknown> }) {
  const barColor = comp.score >= 70 ? theme.success : comp.score >= 40 ? theme.warning : theme.error;
  return (
    <View style={{ marginBottom: tokens.space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <AppText variant="label">{comp.label}</AppText>
        <AppText variant="label" style={{ color: barColor }}>{comp.score}</AppText>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.bg.subtle, overflow: 'hidden' }}>
        <View style={{ width: comp.score + '%', height: 8, borderRadius: 4, backgroundColor: barColor }} />
      </View>
    </View>
  );
});

export default function BondBreakdownScreen({ route, navigation }: { route: { params?: Record<string, unknown> }; navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user } = route?.params || {};
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [acct, setAcct] = useState<Record<string, unknown> | null>(null);
  const [ritual, setRitual] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
      setLoading(true);
      try {
        const [events, snapshot, ritualSummary] = await Promise.all([
          CalendarService.getEvents(),
          AccountabilityService.getSnapshot(user.id).catch(() => null),
          DailyRitualService.getSummary(user.id, 14).catch(() => null),
        ]);
        setAllEvents(events || []);
        setAcct(snapshot);
        setRitual(ritualSummary);
      } catch (e) { reportError('Screen.BondBreakdown', e); setAllEvents([]);
        setAcct(null);
      }
      } catch (e) {
        try { logError('BondBreakdownScreen.load', e); } catch (e) { reportError('Screen.BondBreakdown', e); }
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const breakdown = useMemo(() => {
    const todayKeyStr = todayKeyFn();
    const shared = allEvents.filter((e: { sharedWith?: string[]; createdBy?: string }) => (e.sharedWith?.includes(user.id) || e.createdBy === user.id));
    return calculateBondStrength({
      sharedEvents: shared,
      streakDays: acct?.streak?.current || 0,
      ritualStreak: ritual?.streak || 0,
      balancePct: acct?.balance ?? null,
      todayKey: todayKeyStr,
    });
  }, [allEvents, acct, ritual, user.id]);

  const firstName = getFirstName(user?.name, 'them');
  if (loading) {
    return (
      <Screen>
        <Header title="BondBreakdown" leftAction={{ icon: 'arrow-left', onPress: () => navigation.goBack?.() }} />
        <LoadingState count={4} />
      </Screen>
    );
  }


  return (
    <Screen>
      <Header title={`Bond with ${firstName}`} leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 140 }]} showsVerticalScrollIndicator={false}>
        <Card style={[s.hero, { backgroundColor: theme.bg.card, ...tokens.shadow.sm }]}>
          <AppText variant="caption" color="tertiary">Bond strength</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
            <AppText variant="title" style={{ fontSize: 34 }}>{breakdown.score}</AppText>
            <AppText variant="bodySm" color="secondary" style={{ marginLeft: 10 }}>/ 100 · {breakdown.label}</AppText>
          </View>

          {/* clean, readable progress */}
          <View style={[s.progressTrack, { backgroundColor: theme.bg.subtle }]}> 
            <View style={[s.progressFill, { width: `${Math.min(100, Math.max(0, breakdown.score))}%`, backgroundColor: theme.accent.primary }]} />
          </View>

          {breakdown.narrative ? (
            <AppText variant="bodySm" color="secondary" style={{ marginTop: 10 }}>
              {breakdown.narrative}
            </AppText>
          ) : null}
        </Card>

        <AppText variant="caption" color="tertiary" style={{ marginTop: 14, marginBottom: 8 }}>
          How it’s calculated
        </AppText>

        {breakdown.components.map((c: { label: string; value: number; color?: string }) => (
          <Card key={c.key} style={[s.row, { backgroundColor: theme.bg.card, ...tokens.shadow.sm }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="label">{c.label}</AppText>
              <AppText variant="label">{c.points} pts</AppText>
            </View>
            <AppText variant="caption" color="tertiary" style={{ marginTop: 4 }}>
              {c.detail}
            </AppText>
          </Card>
        ))}

        <Card style={[s.note, { backgroundColor: theme.bg.card, ...tokens.shadow.sm }]}>
          <AppText variant="label">This is transparent on purpose</AppText>
          <AppText variant="caption" color="tertiary" style={{ marginTop: 6 }}>
            Bond strength is based on shared plans and consistency — not “vibes”. Plan more together and it rises.
          </AppText>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  hero: { padding: 14, borderRadius: 18 },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  progressFill: { height: 8, borderRadius: 999 },
  row: { padding: 12, borderRadius: 16, marginBottom: 10 },
  note: { padding: 12, borderRadius: 16, marginTop: 6 },
});