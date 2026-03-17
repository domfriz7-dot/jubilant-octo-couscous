import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet , RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CalendarService from '../services/CalendarService';
import { getCurrentUserId } from '../services/IdentityService';
import TasksService from '../services/TasksService';
import type { CalendarEvent } from '../types/calendar';
import type { Task } from '../types/tasks';
import AccountabilityService from '../services/AccountabilityService';
import XPService from '../services/XPService';
import NotificationService from '../services/NotificationService';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Avatar from '../ui/components/Avatar';
import EmptyState from '../ui/components/EmptyState';
import SmartList from '../ui/components/SmartList';
import LoadingState from '../ui/components/LoadingState';
import Stat from '../ui/components/Stat';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import SectionHeader from '../ui/components/SectionHeader';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import { useConnectionDetailViewModel } from '../viewModels/useConnectionDetailViewModel';
import { todayKey } from '../utils/dateTime';
import { resolveColor } from '../viewModels/resolveColor';
import PulseService, { PULSE_OPTIONS } from '../services/PulseService';
import MomentsService from '../services/MomentsService';
import { analyzeIntents, intentNarrative } from '../services/EventIntent';
import { logError } from '../services/logger';
import { reportError } from '../utils/reportError';
import { getFirstName } from '../utils/partners';
type NavigationLike = { navigate: (screen: string, params?: Record<string, unknown>) => void; goBack?: () => void };
type RouteLike = { params?: Record<string, unknown> };
type ConnectionUser = { id: string; name: string; email?: string; avatar?: string | null; color?: string; relationship?: string; level?: number };


const StatTile = memo(function StatTile({ stat, theme }: { stat: { label: string; value: string | number; icon?: string; color?: string }; theme: Record<string, unknown> }) {
  return (
    <Stat icon={stat.icon} value={stat.value} label={stat.label} color={stat.color} />
  );
});

export default function ConnectionDetailScreen({ route, navigation }: { route: { params?: { user?: ConnectionUser } }; navigation: NavigationLike }) {
  const { user } = route?.params || {};
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]);
  const [acct, setAcct] = useState<Record<string, unknown> | null>(null);
  const [pulseTrend, setPulseTrend] = useState<{ trend: 'rising' | 'falling' | 'steady'; avgWeight: number; recentPulses: Array<{ pulseId: string }>; daysAnswered: number } | null>(null);
  const [moments, setMoments] = useState<unknown[]>([]);
  const [intentInsight, setIntentInsight] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleStatPress = (label: string) => {
    try { haptics.light(); } catch (e) { logError('ConnectionDetailScreen', e); }
    const key = (label || '').toLowerCase();
    if (key.includes('coming')) return navigation.navigate('ConnectionEvents', { user, mode: 'upcoming' });
    if (key.includes('together')) return navigation.navigate('ConnectionEvents', { user, mode: 'past' });
    if (key.includes('bond')) return navigation.navigate('BondBreakdown', { user });
  };


  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
      setLoading(true);
      const [all, tasks, snapshot] = await Promise.all([
        CalendarService.getEvents(), TasksService.getTasks(), AccountabilityService.getSnapshot(user.id),
      ]);
      setAllEvents(all);
      const today = todayKey();
      const userEvents = all.filter((e: { sharedWith?: string[]; createdBy?: string }) => (e.sharedWith?.includes(user.id) || e.createdBy === user.id));
      setEvents(userEvents.filter((e: { date?: string; [k: string]: unknown }) => e.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
      setSharedTasks(tasks.filter((t: { completed?: boolean; sharedWith?: string[]; assignedTo?: string }) =>
        t.sharedWith?.includes(user.id) || t.assignedTo === user.id ||
        (t.sharedWith?.includes(getCurrentUserId()) && t.assignedTo === user.id)
      ).sort((a, b) => { if (a.completed !== b.completed) return a.completed ? 1 : -1; return (a.dueDate || 'z').localeCompare(b.dueDate || 'z'); }));
      setAcct(snapshot);

      // Pulse trend
      try { setPulseTrend(await PulseService.getPulseTrend(user.id)); } catch (e) { logError('ConnectionDetailScreen', e); }
      // Moments
      try { setMoments(await MomentsService.getMomentsForConnection(user.id)); } catch (e) { logError('ConnectionDetailScreen', e); }
      // Check milestones
      try {
        const completedTasks = tasks.filter((t: { completed?: boolean; sharedWith?: string[]; assignedTo?: string }) => t.completed && (t.sharedWith?.includes(user.id) || t.assignedTo === user.id)).length;
        await MomentsService.checkMilestones(user.id, {
          sharedEvents: userEvents.length, sharedTasks: completedTasks,
          streakDays: snapshot?.streak?.current || 0, balancedWeeks: 0,
        });
        setMoments(await MomentsService.getMomentsForConnection(user.id));
      } catch (e) { logError('ConnectionDetailScreen', e); }
      // Intent analysis
      try {
        const analysis = analyzeIntents(userEvents);
        setIntentInsight(intentNarrative(analysis, getFirstName(user.name)));
      } catch (e) { logError('ConnectionDetailScreen', e); }
      } catch (e) {
        try { logError('ConnectionDetailScreen.load', e); } catch (e) { reportError('Screen.ConnectionDetail', e); }
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const vm = useConnectionDetailViewModel({ user, events, allEvents, sharedTasks, acct });
  const levelInfo = useMemo(() => XPService.getLevelInfo((user.level || 1) * 25), [user.level]);
  if (loading) {
    return (
      <Screen>
        <Header title="ConnectionDetail" leftAction={{ icon: 'arrow-left', onPress: () => navigation.goBack?.() }} />
        <LoadingState count={4} />
      </Screen>
    );
  }


  return (
    <Screen>
      <Header title={user.name} leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
      <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { 
        const [all, tasks, snapshot] = await Promise.all([
          CalendarService.getEvents(),
          TasksService.getTasks(),
          AccountabilityService.getSnapshot(user.id),
        ]);
        setAllEvents(all);
        const today = todayKey();
        const userEvents = all.filter((e: { sharedWith?: string[]; createdBy?: string }) => (e.sharedWith?.includes(user.id) || e.createdBy === user.id));
        setEvents(userEvents.filter((e: { date?: string; [k: string]: unknown }) => e.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
        setSharedTasks(tasks.filter((t: { completed?: boolean; sharedWith?: string[]; assignedTo?: string }) =>
          t.sharedWith?.includes(user.id) || t.assignedTo === user.id ||
          (t.sharedWith?.includes(getCurrentUserId()) && t.assignedTo === user.id)
        ).sort((a, b) => { if (a.completed !== b.completed) return a.completed ? 1 : -1; return (a.dueDate || 'z').localeCompare(b.dueDate || 'z'); }));
        setAcct(snapshot);
        try { setPulseTrend(await PulseService.getPulseTrend(user.id)); } catch (e) { logError('ConnectionDetailScreen.refreshPulseTrend', e); }
        try { setMoments(await MomentsService.getMomentsForConnection(user.id)); } catch (e) { logError('ConnectionDetailScreen.refreshMoments', e); }
      } catch (e) { logError('ConnectionDetailScreen.onRefresh', e); } finally { setRefreshing(false); } }} tintColor={theme.accent.primary} />} contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 140 }]} showsVerticalScrollIndicator={false}>

        {/* Profile hero */}
        <Card style={s.heroCard}>
          <Avatar name={user.name} color={user.color} uri={user.avatar} size={72} />
          <AppText variant="heading" numberOfLines={1} style={s.mt12}>{vm.profile.name}</AppText>
          <AppText variant="bodySm" color="secondary" style={s.mt2}>{vm.profile.email}</AppText>
          <View style={s.tagRow}>
            <View style={[s.tag, { backgroundColor: theme.accent.light }]}>
              <Feather name={vm.profile.relIcon} size={12} color={theme.accent.primary} style={s.mr4} />
              <AppText style={{ fontSize: 12, color: theme.accent.primary, fontWeight: '600' }}>{vm.profile.relLabel}</AppText>
            </View>
            <View style={[s.tag, { backgroundColor: theme.bg.subtle }]}>
              <Feather name="star" size={12} color={theme.text.secondary} style={s.mr4} />
              <AppText style={{ fontSize: 12, color: theme.text.secondary, fontWeight: '600' }}>{vm.profile.levelLabel}</AppText>
            </View>
          </View>
        </Card>

        {/* Accountability */}
        {vm.accountability.visible && (
          <Card style={{ marginBottom: tokens.space.md, padding: 0 }} padded={false}>
            <View style={s.acctHeader}>
              <Feather name="activity" size={14} color={theme.accent.primary} />
              <AppText variant="label" style={{ marginLeft: 6, flex: 1 }}>How you\'re doing</AppText>
              {vm.accountability.streakLabel && (
                <View style={[s.streakBadge, { backgroundColor: tokens.streak + '18' }]}>
                  <Feather name="zap" size={12} color={tokens.streak} />
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: tokens.streak, marginLeft: 3 }}>{vm.accountability.streakLabel}</AppText>
                </View>
              )}
            </View>
            <View style={s.balanceSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <AppText style={{ fontSize: 11, fontWeight: '600', color: theme.accent.primary }}>{vm.accountability.myLabel}</AppText>
                <AppText style={{ fontSize: 11, fontWeight: '600', color: user.color }}>{vm.accountability.theirLabel}</AppText>
              </View>
              <View style={[s.balanceTrack, { backgroundColor: theme.bg.subtle }]}>
                <View style={[s.balFill, { width: `${vm.accountability.balancePct}%`, backgroundColor: theme.accent.primary }]} />
                <View style={[s.balFill, { width: `${100 - vm.accountability.balancePct}%`, backgroundColor: user.color }]} />
                <View style={s.balMid} />
              </View>
              <AppText variant="caption" color="secondary" style={s.textCenterMt6}>{vm.accountability.balanceInsight || vm.accountability.balanceLabel}</AppText>
            </View>
            {vm.accountability.missed && (
              <View style={[s.missedRow, { backgroundColor: theme.error + '10' }]}>
                <Feather name="alert-circle" size={14} color={theme.error} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <AppText style={{ fontSize: 12, fontWeight: '600', color: theme.error }}>{vm.accountability.missed.text}</AppText>
                  <AppText style={{ fontSize: 11, color: theme.error, opacity: 0.8, marginTop: 1 }}>{vm.accountability.missed.detail}</AppText>
                </View>
              </View>
            )}
            {vm.accountability.nudge && (
              <View style={[s.nudge, { backgroundColor: resolveColor(vm.accountability.nudge.colorKey, theme) + '10' }]}>
                <Feather name={vm.accountability.nudge.icon} size={12} color={resolveColor(vm.accountability.nudge.colorKey, theme)} style={s.mr8} />
                <AppText style={{ fontSize: 12, color: resolveColor(vm.accountability.nudge.colorKey, theme), flex: 1 }}>{vm.accountability.nudge.text}</AppText>
                <TouchableOpacity
              accessibilityRole="button"
                  onPress={async () => {
                    haptics.success();
                    await NotificationService.sendNudge({
                      title: `Nudge sent to ${getFirstName(user.name)}`,
                      body: vm.accountability.nudge.text,
                    });
                  }}
                  style={[s.nudgeBtn, { backgroundColor: resolveColor(vm.accountability.nudge.colorKey, theme) + '20' }]}
                  activeOpacity={0.8}>
                  <Feather name="send" size={12} color={resolveColor(vm.accountability.nudge.colorKey, theme)} />
                  <AppText style={{ fontSize: 10, fontWeight: '600', color: resolveColor(vm.accountability.nudge.colorKey, theme), marginLeft: 4 }}>Nudge</AppText>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          {vm.stats.map((stat, i) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={i}
              activeOpacity={0.85}
              onPress={() => {
                handleStatPress(stat.label);
              }}
              style={s.flex1}
            >
              <Card style={s.statCard}>
              <Feather name={stat.icon} size={16} color={resolveColor(stat.colorKey, theme)} />
              <AppText variant="heading" style={[{ marginTop: 4 }, typeof stat.value === 'string' && { color: resolveColor(stat.colorKey, theme), fontSize: 15 }]}>{stat.value}</AppText>
              <AppText variant="caption" color="secondary">{stat.label}</AppText>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Insight: relationship frequency */}
        {vm.weekInsight && (
          <AppText variant="bodySm" color="tertiary" style={{ fontStyle: 'italic', marginBottom: tokens.space.md, paddingHorizontal: 2 }}>{vm.weekInsight}</AppText>
        )}

        {/* Level */}
        <Card style={s.levelCard}>
          <View style={s.rowCenter}>
            <View style={[s.levelIcon, { backgroundColor: theme.accent.light }]}>
              <AppText style={{ fontSize: 20 }}>{levelInfo?.icon || '🌱'}</AppText>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <AppText variant="label">{vm.profile.levelLabel} · {levelInfo?.title || 'Starting Out'}</AppText>
              <AppText variant="caption" color="secondary">{vm.bondMessage}</AppText>
            </View>
          </View>
          <View style={[s.barTrack, { backgroundColor: theme.bg.subtle, marginTop: 12 }]}>
            <View style={[s.barFill, { backgroundColor: theme.accent.primary, width: `${vm.profile.levelProgress}%` }]} />
          </View>
        </Card>

        {/* Quick action */}
        <TouchableOpacity
              accessibilityRole="button"
          onPress={() => {
            haptics.light();
            navigation.navigate('AddEvent', {
              selectedDate: todayKey(),
              preSharedWith: [user.id],
            });
          }}
          style={[s.assignBtn, { backgroundColor: theme.accent.light }]}
          activeOpacity={0.85}
          accessibilityLabel={vm.actionLabel}
        >
          <Feather name="calendar" size={16} color={theme.accent.primary} />
          <AppText style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: theme.accent.primary }}>{vm.actionLabel}</AppText>
        </TouchableOpacity>

        {/* Shared tasks */}
        {vm.sharedTasks.rows.length > 0 && (
          <>
            <SectionHeader label={(vm.sharedTasks.label || 'SHARED TASKS').toUpperCase()} />
            <Card padded={false}>
              <SmartList
              data={vm.sharedTasks.rows}
              keyExtractor={(item) => item.id}
              estimatedItemSize={72}
              scrollEnabled={false}
              renderItem={({ item: t, index: idx }) => (
                <View style={[s.taskRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.divider }]}>
                  <View style={[s.taskCheck, {
                    borderColor: t.completed ? theme.accent.primary : (t.isOverdue ? theme.error : t.priorityColor || theme.border),
                    backgroundColor: t.completed ? theme.accent.primary : 'transparent',
                  }]}>
                    {t.completed && <Feather name="check" size={12} color="#FFF" />}
                  </View>
                  <View style={s.flex1}>
                    <AppText style={[s.taskTitle, { color: theme.text.primary }]}>{t.title}</AppText>
                    <AppText style={[s.taskMeta, { color: theme.text.secondary }]}>{t.dueText} • {t.assignedText}</AppText>
                  </View>
                  <AppText style={[s.taskPill, { color: theme.text.secondary, borderColor: theme.border }]}>{t.category}</AppText>
                </View>
              )}
            />
            </Card>
          </>
        )}

        {/* Pulse trend */}
        {pulseTrend && pulseTrend.daysAnswered >= 2 && (
          <Card style={s.mb12}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Feather name={pulseTrend.trend === 'rising' ? 'trending-up' : pulseTrend.trend === 'falling' ? 'trending-down' : 'minus'} size={16}
                color={pulseTrend.trend === 'rising' ? theme.success : pulseTrend.trend === 'falling' ? theme.warning : theme.text.tertiary} />
              <AppText variant="label" style={s.ml6}>Pulse trend</AppText>
            </View>
            <AppText variant="bodySm" color="secondary">
              {pulseTrend.trend === 'rising' ? "Things are warming up between you two."
                : pulseTrend.trend === 'falling' ? "You\'ve been feeling more distant lately. Worth a check-in."
                : `Steady — ${pulseTrend.daysAnswered} days tracked this week.`}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
              {pulseTrend.recentPulses.slice(-7).map((p, i) => {
                const opt = PULSE_OPTIONS.find((o: { id: string }) => o.id === p.pulseId);
                return <AppText key={i} style={{ fontSize: 16 }}>{opt?.emoji || '·'}</AppText>;
              })}
            </View>
          </Card>
        )}

        {/* Intent insight */}
        {intentInsight && (
          <View style={{ paddingHorizontal: 2, marginBottom: tokens.space.md }}>
            <AppText variant="bodySm" color="tertiary" style={{ fontStyle: 'italic' }}>{intentInsight}</AppText>
          </View>
        )}

        {/* Moments — relationship memory timeline */}
        {moments.length > 0 && (
          <>
            <SectionHeader label="YOUR MOMENTS" />
            <Card padded={false}>
              <SmartList
              data={moments.slice(0, 5)}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              estimatedItemSize={84}
              scrollEnabled={false}
              renderItem={({ item: m, index: idx }) => (
                <View key={`${m.id}-${idx}`} style={[s.momentRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.divider }]}>
                  <View style={[s.momentIcon, { backgroundColor: theme.accent.light }]}>
                    <Feather name={m.icon as string} size={14} color={theme.accent.primary} />
                  </View>
                  <View style={s.flex1}>
                    <AppText style={[s.momentTitle, { color: theme.text.primary }]}>{m.title}</AppText>
                    <AppText style={[s.momentMeta, { color: theme.text.secondary }]}>{m.whenText}</AppText>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.text.tertiary} />
                </View>
              )}
            />
            </Card>
          </>
        )}

        {/* Upcoming events */}
        <SectionHeader label={(vm.upcomingEvents.label || 'UPCOMING').toUpperCase()} />
        {vm.upcomingEvents.rows.length === 0 ? (
          <Card><EmptyState icon="calendar" title={vm.upcomingEvents.emptyTitle} message={vm.upcomingEvents.emptyMessage} /></Card>
        ) : (
          <Card padded={false}>
            <SmartList
              data={vm.upcomingEvents.rows}
              keyExtractor={(item) => item.id}
              estimatedItemSize={92}
              scrollEnabled={false}
              renderItem={({ item: e, index: idx }) => (
                <View style={[s.eventRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.divider }]}>
                  <View style={[s.eventStrip, { backgroundColor: e.color || theme.accent.primary }]} />
                  <View style={s.flex1}>
                    <AppText style={[s.eventTitle, { color: theme.text.primary }]}>{e.title}</AppText>
                    <AppText style={[s.eventMeta, { color: theme.text.secondary }]}>{e.whenText} • {e.locationText}</AppText>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.text.tertiary} />
                </View>
              )}
            />
          </Card>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { padding: tokens.space.lg, paddingBottom: 40 },
  heroCard: { alignItems: 'center', paddingVertical: tokens.space.xl, marginBottom: tokens.space.md },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: tokens.radius.pill },
  acctHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 60 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  balanceSection: { paddingHorizontal: 12, paddingVertical: 8 },
  balanceTrack: { height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden', position: 'relative' },
  balFill: { height: 8 },
  balMid: { position: 'absolute', left: '50%', top: -2, width: 2, height: 12, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 1 },
  missedRow: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 12, borderRadius: 10, marginBottom: 8 },
  nudge: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  nudgeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  statsRow: { flexDirection: 'row', gap: tokens.space.sm, marginBottom: tokens.space.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  levelCard: { marginBottom: tokens.space.md, padding: tokens.space.base },
  levelIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  secLabel: { marginBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  taskCheck: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  assignBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'center', padding: tokens.space.base },
  eventStrip: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  assignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: tokens.radius.lg, marginBottom: tokens.space.md },
  momentRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12 },
  flex1: { flex: 1 },
  mb12: { marginBottom: tokens.space.md },
  ml6: { marginLeft: 6 },
  mr4: { marginRight: 4 },
  mr8: { marginRight: 8 },
  mt12: { marginTop: 12 },
  mt2: { marginTop: 2 },
  row: { flexDirection: 'row' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  textCenterMt6: { textAlign: 'center', marginTop: 6 },
});