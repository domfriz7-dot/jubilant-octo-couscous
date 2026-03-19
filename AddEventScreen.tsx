// src/screens/AutopilotDashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { Alert, ScrollView, View, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import LoadingState from '../ui/components/LoadingState';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Button from '../ui/components/Button';
import SectionHeader from '../ui/components/SectionHeader';
import Avatar from '../ui/components/Avatar';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import AutopilotService from '../services/AutopilotService';
import CalendarService from '../services/CalendarService';
import ConnectionsService from '../services/ConnectionsService';
import { getSnapshot } from '../services/SnapshotService';
import { findIntimatePartner, getFirstName } from '../utils/partners';
import { logError } from '../services/logger';
import type { CalendarEvent } from '../types/calendar';
import type { AppUser } from '../types/connections';
import type { AutopilotPrefs } from '../services/AutopilotService';

// ─── Helpers ──────────────────────────────────────────────
function fmtWhen(dateISO: string, time: string): string {
  try {
    const dt = new Date(dateISO + 'T' + (time || '18:00') + ':00');
    return dt.toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return `${dateISO} ${time}`; }
}

function fmtLastRun(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return 'Unknown'; }
}

function healthColor(score: number | null, theme: ReturnType<typeof useAppTheme>['theme']): string {
  if (score == null) return theme.text.tertiary;
  if (score >= 75) return theme.success;
  if (score >= 50) return theme.warning;
  return theme.error;
}

function healthLabel(score: number | null): string {
  if (score == null) return 'No data yet';
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs attention';
  return 'Low';
}

function fmtHour12(h: number): string {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Screen ───────────────────────────────────────────────
type ScheduleRowData = { label: string; value: string; icon?: string; color?: string };

const ScheduleRow = memo(function ScheduleRow({ row, theme }: { row: ScheduleRowData; theme: ReturnType<typeof useAppTheme>['theme'] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: (row.color || theme.accent.primary) + '12', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={row.icon || 'calendar'} size={16} color={row.color || theme.accent.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: tokens.space.md }}>
        <AppText variant="label">{row.label}</AppText>
        <AppText variant="caption" color="secondary">{row.value}</AppText>
      </View>
    </View>
  );
});

export default function AutopilotDashboardScreen({ navigation }: { navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<AutopilotPrefs | null>(null);
  const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
  const [partner, setPartner] = useState<AppUser | null>(null);
  const [health, setHealth] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [runResult, setRunResult] = useState<{ ok: boolean; reason?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await AutopilotService.getPreferences();
      setPrefs(p);

      const all = await ConnectionsService.getAllUsers();
      const partnerUser = (all || []).find((u: AppUser) => u.id === p.partnerId) || findIntimatePartner(all);
      setPartner(partnerUser || null);

      if (p.nextScheduledEventId) {
        const ev = await CalendarService.getEventById(p.nextScheduledEventId);
        setNextEvent(ev || null);
      } else {
        setNextEvent(null);
      }

      const snap = await getSnapshot({ days: 7 });
      setHealth(snap?.health?.score ?? null);
    } catch (e) {
      logError('AutopilotDashboard.load', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggle = async () => {
    if (!partner) {
      Alert.alert('Add a connection first', 'Choose or connect a partner before turning Autopilot on.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Go to People', onPress: () => navigation.navigate('MainTabs', { screen: 'Connections' }) },
      ]);
      return;
    }
    haptics.medium();
    const next = await AutopilotService.setEnabled(!prefs.enabled);
    setPrefs(next);
  };

  const runNow = async () => {
    if (!partner) {
      Alert.alert(
        'No partner selected',
        'Set up a partner in preferences before running Autopilot.',
        [
          { text: 'Open preferences', onPress: () => navigation.navigate('AutopilotSetup') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    haptics.medium();
    setBusy(true);
    setRunResult(null);
    try {
      const res = await AutopilotService.scheduleNextDate({ source: 'manual' });
      setRunResult(res);
      await load();
      if (res.ok) {
        haptics.success();
      } else {
        haptics.warning();
        const messages: Record<string, string> = {
          no_partner: 'No partner selected. Open preferences to set one up.',
          no_slot: 'No free time slots found in the next 2 weeks. Try adjusting your preferred days or time window.',
        };
        Alert.alert('Could not schedule', messages[res.reason] || 'Something went wrong. Try adjusting your preferences.');
      }
    } catch (e) {
      logError('AutopilotDashboard.runNow', e);
      haptics.error();
      Alert.alert('Error', 'Something went wrong while scheduling. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ─── Derived ──────────────────────────────────────────────
  const isEnabled = prefs?.enabled;

  const preferredDaysLabel = useMemo(() => {
    const days = prefs?.preferredDays || [];
    if (days.length === 0) return 'Any day';
    if (days.length === 7) return 'Every day';
    return days.sort((a: number, b: number) => a - b).map((d: number) => DAY_LABELS[d]).join(', ');
  }, [prefs?.preferredDays]);

  const timeWindowLabel = useMemo(() => {
    const tw = prefs?.timeWindow || { startHour: 18, endHour: 22 };
    return `${fmtHour12(tw.startHour)} – ${fmtHour12(tw.endHour)}`;
  }, [prefs?.timeWindow]);

  // ─── Loading ──────────────────────────────────────────────
  if (!prefs) {
    return (
      <Screen>
        <Header
          title="Autopilot"
          subtitle="Automatic scheduling"
          leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        />
        <LoadingState message="Loading autopilot..." />
      </Screen>
    );
  }


  if (!partner) {
    return (
      <Screen>
        <Header
          title="Autopilot"
          subtitle="Automatic scheduling"
          leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
          rightAction={{ icon: 'sliders', label: 'Preferences', onPress: () => navigation.navigate('AutopilotSetup') }}
        />
        <View style={{ padding: tokens.space.lg }}>
          <Card>
            <AppText variant="label" style={{ fontSize: 16 }}>Connect a partner first</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 8 }}>
              Autopilot works once you have a connected partner so it can schedule shared date nights instead of solo events.
            </AppText>
            <Button title="Go to Invite" onPress={() => navigation.navigate('Invite')} style={{ marginTop: 16 }} />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Autopilot"
        subtitle="Automatic scheduling"
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        rightAction={{ icon: 'sliders', label: 'Preferences', onPress: () => navigation.navigate('AutopilotSetup') }}
      />

      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 160 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} />}
      >
        {/* ── Status toggle ──────────────────────────────── */}
        <Card style={s.statusCard}>
          <View style={s.statusRow}>
            <View style={[s.statusIcon, { backgroundColor: isEnabled ? theme.accent.primary + '18' : theme.bg.subtle }]}>
              <Feather name={isEnabled ? 'zap' : 'zap-off'} size={20} color={isEnabled ? theme.accent.primary : theme.text.tertiary} />
            </View>
            <View style={s.flex1}>
              <AppText variant="label" style={{ fontSize: 16 }}>
                {isEnabled ? 'Autopilot is active' : 'Autopilot is paused'}
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {isEnabled
                  ? 'Automatically finding time for date nights each week.'
                  : 'Turn on to auto-schedule based on your calendars and preferences.'}
              </AppText>
            </View>
            <TouchableOpacity
              onPress={toggle}
              activeOpacity={0.85}
              accessibilityRole="switch"
              accessibilityState={{ checked: isEnabled }}
              style={[s.toggle, { backgroundColor: isEnabled ? theme.accent.primary : theme.bg.subtle }]}
            >
              <View style={[s.knob, { transform: [{ translateX: isEnabled ? 18 : 0 }] }]} />
            </TouchableOpacity>
          </View>
        </Card>

        {!partner ? (
          <Card style={{ marginTop: tokens.space.md }}>
            <AppText variant="label">Connect someone first</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 6 }}>
              Autopilot only works once a real connection has accepted your invite. Then it can schedule around both of you.
            </AppText>
            <TouchableOpacity
              onPress={() => navigation.navigate('MainTabs', { screen: 'Connections' })}
              activeOpacity={0.85}
              style={[s.primaryCta, { backgroundColor: theme.accent.primary }]}
            >
              <AppText style={{ color: '#fff', fontWeight: '700' }}>Go to People</AppText>
            </TouchableOpacity>
          </Card>
        ) : null}

        {/* ── Overview ───────────────────────────────────── */}
        <View style={s.statsGrid}>
          <Card style={s.statCard}>
            <View style={[s.statDot, { backgroundColor: healthColor(health, theme) }]} />
            <AppText variant="caption" color="secondary">Health</AppText>
            <AppText variant="heading" style={{ marginTop: 4, color: healthColor(health, theme) }}>
              {health != null ? `${health}%` : '—'}
            </AppText>
            <AppText variant="caption" color="tertiary" style={{ marginTop: 2 }}>{healthLabel(health)}</AppText>
          </Card>

          <Card style={s.statCard}>
            {partner ? (
              <>
                <Avatar name={partner.name} color={partner.color} size={28} />
                <AppText variant="caption" color="secondary" style={{ marginTop: 6 }}>Partner</AppText>
                <AppText variant="label" numberOfLines={1} style={{ marginTop: 2 }}>
                  {getFirstName(partner.name, 'Partner')}
                </AppText>
              </>
            ) : (
              <>
                <View style={[s.statDot, { backgroundColor: theme.warning }]} />
                <AppText variant="caption" color="secondary">Partner</AppText>
                <AppText variant="label" style={{ marginTop: 4, color: theme.warning }}>Not set</AppText>
                <TouchableOpacity onPress={() => navigation.navigate('AutopilotSetup')} accessibilityRole="button" activeOpacity={0.8}>
                  <AppText variant="caption" style={{ color: theme.accent.primary, marginTop: 4 }}>Set up →</AppText>
                </TouchableOpacity>
              </>
            )}
          </Card>
        </View>

        {/* ── Settings summary ───────────────────────────── */}
        <Card style={{ marginTop: tokens.space.sm }}>
          <View style={s.prefHeader}>
            <AppText variant="label">Current settings</AppText>
            <TouchableOpacity onPress={() => navigation.navigate('AutopilotSetup')} accessibilityRole="button" activeOpacity={0.8}>
              <AppText variant="caption" style={{ color: theme.accent.primary }}>Edit</AppText>
            </TouchableOpacity>
          </View>
          <View style={s.prefGrid}>
            {[
              { icon: 'calendar', text: preferredDaysLabel },
              { icon: 'clock', text: timeWindowLabel },
              { icon: 'dollar-sign', text: prefs.budget === 'low' ? 'Budget-friendly' : prefs.budget === 'high' ? 'Premium' : 'Moderate' },
              { icon: 'refresh-cw', text: `Last run: ${fmtLastRun(prefs.lastRunAt)}` },
            ].map((row, i) => (
              <View key={i} style={s.prefItem}>
                <Feather name={row.icon as string} size={14} color={theme.text.tertiary} />
                <AppText variant="bodySm" color="secondary" style={{ marginLeft: 8 }}>{row.text}</AppText>
              </View>
            ))}
          </View>
        </Card>

        {/* ── Next Date ──────────────────────────────────── */}
        <AppText variant="label" style={s.sectionLabel}>Next date</AppText>

        {nextEvent ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EventDetails', { eventId: nextEvent.id })}
            accessibilityRole="button"
          >
            <Card style={[s.nextCard, { borderLeftWidth: 3, borderLeftColor: theme.accent.primary }]}>
              <View style={s.nextRow}>
                <AppText style={{ fontSize: 28 }}>{nextEvent.icon || '🤖'}</AppText>
                <View style={[s.flex1, { marginLeft: 12 }]}>
                  <AppText variant="label" style={{ fontSize: 15 }}>{nextEvent.title}</AppText>
                  <AppText variant="bodySm" color="secondary" style={{ marginTop: 2 }}>{fmtWhen(nextEvent.date, nextEvent.time)}</AppText>
                  {nextEvent.location && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Feather name="map-pin" size={11} color={theme.text.tertiary} />
                      <AppText variant="caption" color="tertiary" style={{ marginLeft: 4 }}>{nextEvent.location}</AppText>
                    </View>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={theme.text.tertiary} />
              </View>
              {nextEvent.requiresReconfirm && (
                <View style={[s.confirmBanner, { backgroundColor: theme.accent.primary + '10' }]}>
                  <Feather name="info" size={12} color={theme.accent.primary} />
                  <AppText variant="caption" style={{ color: theme.accent.primary, marginLeft: 6 }}>Tap to confirm, reschedule, or view details</AppText>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ) : (
          <Card style={s.emptyNextCard}>
            <View style={[s.emptyNextIcon, { backgroundColor: theme.bg.subtle }]}>
              <Feather name="calendar" size={24} color={theme.text.tertiary} />
            </View>
            <AppText variant="label" style={{ marginTop: 12 }}>No date scheduled</AppText>
            <AppText variant="bodySm" color="secondary" style={{ marginTop: 4, textAlign: 'center', maxWidth: 240 }}>
              {isEnabled
                ? 'Autopilot will schedule one automatically, or you can run it now.'
                : 'Turn on Autopilot or tap below to schedule manually.'}
            </AppText>
          </Card>
        )}

        {/* ── Success feedback ───────────────────────────── */}
        {runResult?.ok && (
          <View style={[s.resultBanner, { backgroundColor: theme.success + '15' }]}>
            <Feather name="check-circle" size={16} color={theme.success} />
            <AppText variant="bodySm" style={{ color: theme.success, marginLeft: 8, flex: 1 }}>Date night scheduled successfully!</AppText>
          </View>
        )}

        {/* ── Actions ────────────────────────────────────── */}
        <View style={s.actions}>
          <TouchableOpacity
            onPress={runNow}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[s.primaryBtn, { backgroundColor: busy ? theme.bg.subtle : theme.accent.primary }]}
          >
            <Feather name={busy ? 'loader' : 'zap'} size={16} color={busy ? theme.text.tertiary : '#FFF'} />
            <AppText style={[s.primaryBtnText, { color: busy ? theme.text.tertiary : '#FFF' }]}>
              {busy ? 'Finding the best time...' : 'Run Autopilot now'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AutopilotSetup')}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[s.secondaryBtn, { borderColor: theme.border }]}
          >
            <Feather name="sliders" size={14} color={theme.text.secondary} />
            <AppText variant="label" color="secondary" style={{ marginLeft: 8 }}>Edit preferences</AppText>
          </TouchableOpacity>
        </View>

        {/* ── How it works ───────────────────────────────── */}
        <Card style={{ marginTop: tokens.space.xl }}>
          <AppText variant="label" style={{ marginBottom: 10 }}>How Autopilot works</AppText>
          {[
            { icon: 'search', text: 'Scans both calendars for mutual free time' },
            { icon: 'heart', text: 'Adjusts date ideas based on relationship health' },
            { icon: 'map-pin', text: 'Picks venues matching your vibe and budget' },
            { icon: 'bell', text: 'Sends a reminder so you never forget' },
          ].map((item, i) => (
            <View key={i} style={s.howItem}>
              <View style={[s.howDot, { backgroundColor: theme.accent.primary + '15' }]}>
                <Feather name={item.icon as string} size={12} color={theme.accent.primary} />
              </View>
              <AppText variant="bodySm" color="secondary" style={{ flex: 1, marginLeft: 10 }}>{item.text}</AppText>
            </View>
          ))}
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { padding: tokens.space.lg, paddingBottom: 60 },
  statusCard: { marginBottom: tokens.space.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 4, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF' },
  statsGrid: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: tokens.space.base },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  prefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space.sm },
  prefGrid: { gap: 8 },
  prefItem: { flexDirection: 'row', alignItems: 'center' },
  sectionLabel: { marginTop: tokens.space.lg, marginBottom: tokens.space.sm },
  nextCard: { padding: tokens.space.base },
  nextRow: { flexDirection: 'row', alignItems: 'center' },
  confirmBanner: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 8, borderRadius: tokens.radius.sm },
  emptyNextCard: { alignItems: 'center', paddingVertical: tokens.space.xl },
  emptyNextIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  resultBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: tokens.radius.md, marginTop: tokens.space.sm },
  actions: { marginTop: tokens.space.lg, gap: tokens.space.sm },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: tokens.radius.lg },
  primaryBtnText: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: tokens.radius.lg, borderWidth: 1 },
  howItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  howDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
});
