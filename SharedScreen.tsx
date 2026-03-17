import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';
import type { CalendarEvent } from '../types/calendar';
import { Alert, RefreshControl, ScrollView, View, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import AppText from '../ui/components/AppText';
import Screen from '../ui/components/Screen';
import PressableScale from '../ui/components/PressableScale';
import { FadeIn } from '../ui/components/FadeIn';
import { SkeletonCard, SkeletonPulse, SkeletonRow } from '../ui/components/Skeleton';
import { haptics } from '../ui/haptics';
import { useUsers } from '../hooks/useUsers';
import { tokens } from '../config/tokens';
import { useHomeData } from './home/hooks/useHomeData';
import AccountabilityService from '../services/AccountabilityService';
import PulseService, { PULSE_OPTIONS } from '../services/PulseService';
import MomentsService from '../services/MomentsService';
import { useHomeViewModel } from '../viewModels/useHomeViewModel';
import { resolveColor } from '../viewModels/resolveColor';
import { getWallpaper } from '../services/WallpaperService';
import { findIntimatePartner, getFirstName } from '../utils/partners';
import { getSnapshot } from '../services/SnapshotService';
import { logError } from '../services/logger';
import TutorialService from '../services/TutorialService';

// Extracted sub-components
import HeroCard from './home/HeroCard';
import DailyPulse from './home/DailyPulse';
import IntelligenceCards from './home/IntelligenceCards';
import PeopleSection from './home/PeopleSection';
import MomentsSection from './home/MomentsSection';
import TasksPreview from './home/TasksPreview';
import EmptyState from '../ui/components/EmptyState';
import PartnerPulseCard from './home/PartnerPulseCard';
import QuickAddPresets from './home/QuickAddPresets';


type Wallpaper = Awaited<ReturnType<typeof getWallpaper>>;
type AccountabilityOverview = Awaited<ReturnType<typeof AccountabilityService.getOverview>>;
type PulseOverview = Awaited<ReturnType<typeof PulseService.getTodayPulse>>;
type LatestMoment = Awaited<ReturnType<typeof MomentsService.getLatestMoment>>;
type Snapshot = Awaited<ReturnType<typeof getSnapshot>>;

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  StackScreenProps<RootStackParamList>
>;

const MomentCard = memo(function MomentCard({ moment, onPress, theme }: { moment: { icon?: string; title?: string; subtitle?: string; connectionId?: string } | null; onPress: () => void; theme: Record<string, unknown> }) {
  return (
    <PressableScale
      onPress={onPress}
      style={[s.momentCard, { backgroundColor: theme.bg.card, ...theme.shadow.sm }]}
      accessibilityRole="button" accessibilityLabel={`Moment: ${moment.title}. ${moment.body}`}
    >
      <View style={[s.momentIcon, { backgroundColor: theme.accent.primary + '12' }]}>
        <AppText style={{ fontSize: 20 }}>{moment.emoji}</AppText>
      </View>
      <View style={s.momentBody}>
        <AppText variant="label" numberOfLines={1}>{moment.title}</AppText>
        <AppText variant="caption" color="tertiary" style={{ marginTop: 2 }}>{moment.body}</AppText>
      </View>
    </PressableScale>
  );
});

export default function HomeScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  // ── Data loading ────────────────────────────────────────
  const [wallpaper, setWallpaper] = useState<Wallpaper>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => { getWallpaper().then(setWallpaper).catch(() => {}); }, []);

  const { todayDateKey, computed } = useHomeData({ themeAccent: theme.accent.primary });
  const { users, others, reload: reloadUsers } = useUsers();
  const [acct, setAcct] = useState<AccountabilityOverview>(null);
  const [pulse, setPulse] = useState<(PulseOverview & { connectionId?: string; firstName?: string; color?: string }) | null>(null);
  const [latestMoment, setLatestMoment] = useState<LatestMoment>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(null);
  const [partnerPulse, setPartnerPulse] = useState<{ emoji: string; label: string } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Memoised so downstream callbacks don't re-derive on every render
  const intimatePartner = useMemo(() => findIntimatePartner(others), [others]);

  const loadSideData = useCallback(async () => {
    if (others.length === 0) return;
    const acctP = AccountabilityService.getOverview(others.map((u: { id: string }) => u.id))
      .then(setAcct).catch((e) => logError('HomeScreen:acct', e));
    const snapshotP = getSnapshot({ days: 7 })
      .then(setSnapshot).catch((e) => logError('HomeScreen:snapshot', e));
    const momentP = MomentsService.getLatestMoment()
      .then(setLatestMoment).catch((e) => logError('HomeScreen:moment', e));
    const pulseP = (async () => {
      if (!intimatePartner) return;
      const firstName = getFirstName(intimatePartner.name);
      try {
        const p = await PulseService.getTodayPulse(intimatePartner.id, firstName);
        setPulse({ connectionId: intimatePartner.id, firstName, color: intimatePartner.color, ...p });
      } catch (e) { logError('HomeScreen:pulse', e); }
      try {
        const recent = await PulseService.getRecentPulses?.(intimatePartner.id, 1);
        if (recent?.[0]?.pulseId) {
          const opt = PULSE_OPTIONS.find((o: { id: string }) => o.id === recent[0].pulseId);
          if (opt) setPartnerPulse({ emoji: opt.emoji, label: opt.label });
        }
      } catch (e) { logError('HomeScreen.partnerPulse', e); }
    })();
    await Promise.all([acctP, snapshotP, momentP, pulseP]);
    setDataReady(true);
  }, [others, intimatePartner]);

  useEffect(() => { loadSideData(); }, [loadSideData]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      TutorialService.shouldShowFirstRunTutorial()
        .then((shouldShow) => {
          if (active) {
            setShowTutorial(shouldShow);
            if (shouldShow) setTutorialStep(0);
          }
        })
        .catch((e) => logError('HomeScreen.tutorial', e));
      return () => { active = false; };
    }, [])
  );

  const dismissTutorial = useCallback(async () => {
    setShowTutorial(false);
    setTutorialStep(0);
    await TutorialService.completeFirstRunTutorial();
  }, []);

  const tutorialCards = [
    {
      icon: 'home',
      color: '#B8897A',
      title: 'Your shared home',
      body: 'Everything lives here — your next plan, today\'s pulse check, quick actions, and your recent memories. Pull down to refresh anytime.',
      cta: 'Next',
      action: () => setTutorialStep(1),
    },
    {
      icon: 'calendar',
      color: '#D9A566',
      title: 'Plan in seconds',
      body: 'Tap "Plan something" or use Quick Plan presets to create events instantly. The AI Date Planner crafts tailored ideas based on your mood, budget, and schedule.',
      cta: 'Next',
      action: () => setTutorialStep(2),
    },
    {
      icon: 'heart',
      color: '#C06B65',
      title: 'Daily Pulse & Ritual',
      body: 'A 30-second daily check-in tracks how you feel about your person. Over time, this builds your Relationship Health score and Weekly Report.',
      cta: 'Next',
      action: () => setTutorialStep(3),
    },
    {
      icon: 'activity',
      color: '#6B9B7F',
      title: 'Health & Intelligence',
      body: 'Your Relationship Health score, Conflict Predictor, Bond Breakdown, and Tonight Suggestion all learn from your check-ins and calendar patterns.',
      cta: 'Next',
      action: () => setTutorialStep(4),
    },
    {
      icon: 'check-square',
      color: '#7B93B3',
      title: 'Shared tasks & memories',
      body: 'Create to-dos you tackle together. Memory Timeline captures your shared moments — milestones, streaks, and firsts — so nothing gets lost.',
      cta: 'Next',
      action: () => setTutorialStep(5),
    },
    {
      icon: 'send',
      color: '#B8897A',
      title: 'Invite your person',
      body: 'Send a secure invite link or code. Once they join, plans, pulses, and memories sync across both devices in real time.',
      cta: 'Send invite',
      action: () => { setShowTutorial(false); TutorialService.completeFirstRunTutorial().catch(() => {}); navigation.navigate('Invite'); },
    },
  ];

  useEffect(() => {
    if (!showTutorial) return;
    if (tutorialStep > tutorialCards.length - 1) setTutorialStep(0);
  }, [showTutorial, tutorialStep]);


  // ── Pull to refresh ─────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      reloadUsers();
      await loadSideData();
    } catch (e) {
      logError('HomeScreen.refresh', e);
    } finally {
      setRefreshing(false);
    }
  }, [reloadUsers, loadSideData]);

  // ── ViewModel ───────────────────────────────────────────
  const vm = useHomeViewModel({ computed, todayDateKey, users, others, acct });
  const heroColor = resolveColor(vm.hero.colorKey, theme);

  // ── Latest moment handler ───────────────────────────────
  const handleLatestMomentPress = useCallback(async () => {
    try { haptics.light(); } catch (e) { logError('HomeScreen.haptics', e); }
    const connectionId = latestMoment?.connectionId || null;

    // If it's a milestone about first plan, offer to create one
    const isFirstPlan = (latestMoment?.meta?.milestoneId === 'first_event') ||
      (typeof latestMoment?.title === 'string' && latestMoment.title.toLowerCase().includes('first plan'));

    if (isFirstPlan) {
      try {
        const CalendarService = (await import('../services/CalendarService')).default;
        const all = await CalendarService.getEvents();
        const todayKeyStr = todayDateKey;
        const shared = (all as CalendarEvent[] || []).filter((e: CalendarEvent) => {
          const participants = new Set([e.createdBy, ...(e.sharedWith || [])].filter(Boolean));
          if (connectionId) return participants.has(connectionId);
          return (e.sharedWith || []).length > 0;
        });
        if (shared.length === 0) {
          Alert.alert(
            'No plans yet',
            'Would you like to plan something together with someone?',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Create plan', onPress: () => navigation.navigate('AddEvent', { selectedDate: todayKeyStr }) },
              { text: 'Invite someone', onPress: () => navigation.navigate('MainTabs', { screen: 'Connections' }) },
            ]
          );
          return;
        }
        navigation.navigate('PlansTogether', { connectionId });
      } catch {
        navigation.navigate('PlansTogether', { connectionId });
      }
      return;
    }

    // For all other moments, navigate to the Memory Timeline
    navigation.navigate('MemoryTimeline', { connectionId });
  }, [latestMoment, navigation, todayDateKey]);

  // ── Loading skeleton ────────────────────────────────────
  const handleQuickAdd = useCallback((preset: { emoji: string; label: string; time: string; duration: number }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    navigation.navigate('AddEvent', {
      selectedDate: dateStr,
      prefill: { title: preset.label, time: preset.time, icon: preset.emoji },
    });
  }, [navigation]);

  const showSkeleton = !dataReady && others.length > 0;

  // ── LAYOUT ──────────────────────────────────────────────
  return (
    <Screen>
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + tokens.space.base }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent.primary}
            colors={[theme.accent.primary]}
          />
        }
      >
        {/* TIER 1 — Greeting */}
        <FadeIn delay={0}>
          <View style={s.greet} accessibilityRole="header">
            <AppText variant="bodySm" color="tertiary">{vm.greeting.date}</AppText>
            <AppText variant="title" numberOfLines={1} style={s.greetLine}>{vm.greeting.line}</AppText>
          </View>
        </FadeIn>

        <Modal
          visible={showTutorial}
          transparent
          animationType="fade"
          onRequestClose={dismissTutorial}
        >
          <View style={s.tutorialOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={dismissTutorial} />
            <View style={[s.tutorialSheet, { backgroundColor: theme.bg.card, borderColor: theme.divider, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <View style={s.tutorialHandleWrap}>
                <View style={[s.tutorialHandle, { backgroundColor: theme.bg.subtle }]} />
              </View>
              <View style={s.tutorialTopRow}>
                <View style={[s.tutorialBadge, { backgroundColor: (tutorialCards[tutorialStep] as { color: string; icon: string }).color + '14' }]}>
                  <Feather name={(tutorialCards[tutorialStep] as { color: string; icon: string }).icon} size={22} color={(tutorialCards[tutorialStep] as { color: string }).color} />
                </View>
                <TouchableOpacity onPress={dismissTutorial} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <AppText variant="caption" color="tertiary">Skip tour</AppText>
                </TouchableOpacity>
              </View>
              <AppText variant="caption" color="tertiary" style={{ letterSpacing: 0.5 }}>STEP {tutorialStep + 1} OF {tutorialCards.length}</AppText>
              <AppText variant="title" style={s.tutorialTitle}>{tutorialCards[tutorialStep].title}</AppText>
              <AppText variant="body" color="secondary" style={s.tutorialBody}>{tutorialCards[tutorialStep].body}</AppText>
              <View style={s.tutorialDots}>
                {tutorialCards.map((_, i) => (
                  <View key={i} style={[s.tutorialDot, { backgroundColor: i === tutorialStep ? theme.accent.primary : theme.accent.primary + '30' }]} />
                ))}
              </View>
              <View style={s.tutorialActionRow}>
                <TouchableOpacity
                  onPress={() => {
                    if (tutorialStep === 0) dismissTutorial();
                    else setTutorialStep((prev) => Math.max(0, prev - 1));
                  }}
                  activeOpacity={0.8}
                  style={[s.tutorialSecondaryButton, { backgroundColor: theme.bg.subtle, borderColor: theme.divider }]}
                >
                  <AppText variant="label">{tutorialStep === 0 ? 'Close' : 'Back'}</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={tutorialCards[tutorialStep].action} activeOpacity={0.8} style={[s.tutorialButton, { backgroundColor: theme.accent.primary }]}>
                  <AppText variant="label" style={{ color: '#fff' }}>{tutorialCards[tutorialStep].cta}</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Brand new user empty state */}
        {dataReady && !vm.people && !vm.moments && !vm.tasks && (
          <FadeIn delay={45}>
            <EmptyState
              icon="calendar"
              title="Welcome to U&Me!"
              description="Add your first shared event to kick things off."
              actionTitle="Create Event"
              onAction={() => navigation.navigate('AddEvent', { selectedDate: todayDateKey })}
              style={{ marginTop: 12 }}
            />
          </FadeIn>
        )}

        {/* TIER 1 — Hero + CTA */}
        <FadeIn delay={40}>
          <HeroCard
            vm={vm}
            heroColor={heroColor}
            wallpaper={wallpaper}
            onPlanPress={() => navigation.navigate('AddEvent', { selectedDate: todayDateKey })}
          />
        </FadeIn>


        {/* Home entry — AI Date Planner (featured) */}
        <FadeIn delay={80}>
          <PressableScale
            onPress={() => { haptics.light(); navigation.navigate('AIDatePlanner'); }}
            style={[s.aiEntry, { backgroundColor: theme.accent.primary + '0A', borderColor: theme.accent.primary + '20' }]}
            accessibilityRole="button" accessibilityLabel="Plan a date with AI"
          >
            <View style={s.aiEntryRow}>
              <View style={[s.aiEntryBadge, { backgroundColor: theme.accent.primary + '18' }]}>
                <AppText style={{ fontSize: 20 }}>✨</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" style={s.aiEntryTitle}>Plan a date with AI</AppText>
                <AppText variant="caption" color="secondary" numberOfLines={2}>Tailored ideas based on mood, budget, time & your calendar.</AppText>
              </View>
              <View style={[s.aiChevron, { backgroundColor: theme.accent.primary + '12' }]}>
                <AppText style={{ color: theme.accent.primary, fontSize: 16, fontWeight: '600' }}>›</AppText>
              </View>
            </View>
          </PressableScale>
        </FadeIn>

        {/* TIER 2 — Next up */}
        {vm.nextUp && (
          <FadeIn delay={100}>
            <PressableScale
              onPress={() => navigation.navigate('EventDetails', { event: vm.nextUp.event })}
              style={[s.nextUp, { backgroundColor: (vm.nextUp.color || theme.accent.primary) + '08', borderLeftColor: vm.nextUp.color || theme.accent.primary }]}
              accessibilityRole="button" accessibilityLabel={`Up next: ${vm.nextUp.title}, ${vm.nextUp.time}`}
            >
              {vm.nextUp.event?.icon ? (
                <View style={[s.nextUpIcon, { backgroundColor: (vm.nextUp.color || theme.accent.primary) + '15' }]}>
                  <AppText style={{ fontSize: 18 }}>{vm.nextUp.event.icon}</AppText>
                </View>
              ) : null}
              <View style={s.nextUpBody}>
                <AppText variant="tiny" style={{ color: vm.nextUp.color || theme.accent.primary }}>UP NEXT</AppText>
                <AppText variant="label" style={s.nextUpTitle}>{vm.nextUp.title}</AppText>
                <AppText variant="caption" color="secondary">{vm.nextUp.time}{vm.nextUp.description ? ` · ${vm.nextUp.description}` : ''}</AppText>
              </View>
            </PressableScale>
          </FadeIn>
        )}

        {/* Daily Pulse */}
        {showSkeleton && !pulse ? (
          <FadeIn delay={140}><SkeletonPulse style={s.sectionGap} /></FadeIn>
        ) : (
          <FadeIn delay={180}>
            <DailyPulse pulse={pulse} setPulse={setPulse} />
          </FadeIn>
        )}

        {/* Partner's pulse */}
        {partnerPulse && others.length > 0 && (
          <FadeIn delay={200}>
            <PartnerPulseCard
              partnerName={getFirstName(intimatePartner?.name, 'Partner')}
              pulse={partnerPulse}
            />
          </FadeIn>
        )}

        {/* Quick-add presets */}
        {others.length > 0 && (
          <FadeIn delay={160}>
            <QuickAddPresets onSelect={handleQuickAdd} />
          </FadeIn>
        )}

        {/* Latest Moment */}
        {latestMoment && (
          <FadeIn delay={180}>
            <MomentCard moment={latestMoment} onPress={handleLatestMomentPress} theme={theme} />
          </FadeIn>
        )}

        {/* Intelligence Cards */}
        {showSkeleton && !snapshot ? (
          <FadeIn delay={220}><SkeletonCard style={s.sectionGap} /></FadeIn>
        ) : (
          <FadeIn delay={300}>
            <IntelligenceCards snapshot={snapshot} navigation={navigation} />
          </FadeIn>
        )}

        {/* People */}
        {showSkeleton && !vm.people ? (
          <FadeIn delay={260}>
            <SkeletonRow />
            <SkeletonRow style={s.skeletonSmall} />
            <SkeletonRow style={s.skeletonSmall} />
          </FadeIn>
        ) : (
          <FadeIn delay={360}>
            <PeopleSection vm={vm} navigation={navigation} />
          </FadeIn>
        )}

        {/* Moments */}
        <FadeIn delay={300}>
          <MomentsSection vm={vm} navigation={navigation} />
        </FadeIn>

        {/* Tasks */}
        <FadeIn delay={340}>
          <TasksPreview vm={vm} navigation={navigation} />
        </FadeIn>

        <View style={s.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: tokens.space.lg, paddingBottom: 120 },
  greet: { marginBottom: tokens.space.xl, paddingTop: tokens.space.md },
  greetLine: { marginTop: 6, fontSize: 28, letterSpacing: -0.5 },
  nextUp: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    borderRadius: tokens.radius.xl, borderLeftWidth: 3, borderLeftColor: 'transparent', marginBottom: tokens.space.lg,
  },
  nextUpIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  nextUpBody: { flex: 1 },
  nextUpTitle: { marginTop: 3 },
  momentCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    borderRadius: tokens.radius.xl, marginBottom: tokens.space.lg,
  },
  momentIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  momentBody: { marginLeft: 16, flex: 1 },
  sectionGap: { marginBottom: tokens.space.xl },
  skeletonSmall: { marginTop: tokens.space.xs },

  aiEntry: {
    padding: 18,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    marginBottom: tokens.space.lg,
  },
  aiEntryRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  aiEntryBadge: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  aiEntryTitle: { marginBottom: 3 },
  aiChevron: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  tutorialOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tutorialSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  tutorialHandleWrap: { alignItems: 'center', marginBottom: 14 },
  tutorialHandle: { width: 42, height: 5, borderRadius: 999 },
  tutorialTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tutorialBadge: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tutorialTitle: { marginTop: 8, fontSize: 28, lineHeight: 32 },
  tutorialBody: { marginTop: 10, lineHeight: 24 },
  tutorialDots: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 22 },
  tutorialDot: { width: 6, height: 6, borderRadius: 3 },
  tutorialActionRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  tutorialSecondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tutorialButton: {
    flex: 2,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSpacer: { height: tokens.space.xl },
});