/**
 * AIDatePlannerScreen — polished form + result view
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import WrapRow from '../ui/components/WrapRow';
import * as Location from 'expo-location';
import type { StackScreenProps } from '@react-navigation/stack';
import AIDatePlannerService from '../services/AIDatePlannerService';
import GooglePlacesService from '../services/GooglePlacesService';
import CalendarService from '../services/CalendarService';
import { logError } from '../services/logger';
import { isProUser } from '../services/SubscriptionService';
import { getTodayUsageCount } from '../services/AIUsageService';
import { logEvent } from '../services/Telemetry';
import { openPaywall } from '../services/openPaywall';
import type { DatePlan, DatePlanRequest, DateMood } from '../types/aiDatePlanner';
import type { RootStackParamList } from '../navigation/types';

import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import Button from '../ui/components/Button';
import Input from '../ui/components/Input';
import AppText from '../ui/components/AppText';
import ShareCard from '../ui/components/ShareCard';
import SmartList from '../ui/components/SmartList';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import { reportError } from '../utils/reportError';

type Props = StackScreenProps<RootStackParamList, 'AIDatePlanner'>;

const DAILY_LIMIT_FREE = 2;

// ─── Config ───────────────────────────────────────────────
const MOODS: Array<{ id: DateMood; emoji: string; label: string; desc: string }> = [
  { id: 'romantic', emoji: '💕', label: 'Romantic', desc: 'Intimate & warm' },
  { id: 'fun', emoji: '🎉', label: 'Fun', desc: 'Light & playful' },
  { id: 'adventurous', emoji: '🌟', label: 'Adventurous', desc: 'Try something new' },
  { id: 'relaxing', emoji: '😌', label: 'Relaxing', desc: 'Low-key & easy' },
  { id: 'surprise', emoji: '🎁', label: 'Surprise', desc: "Dealer's choice" },
];

const BUDGET_PRESETS = [
  { amount: 50, label: '$50', icon: 'coffee', desc: 'Casual' },
  { amount: 100, label: '$100', icon: 'heart', desc: 'Classic' },
  { amount: 200, label: '$200', icon: 'star', desc: 'Special' },
  { amount: 500, label: '$500', icon: 'award', desc: 'Premium' },
];

const RADIUS_OPTIONS = [
  { km: 5, label: '5 km', desc: 'Walkable' },
  { km: 10, label: '10 km', desc: 'Nearby' },
  { km: 25, label: '25 km', desc: 'Short drive' },
  { km: 50, label: '50 km', desc: 'Day trip' },
] as const;
type RadiusKm = 5 | 10 | 25 | 50;

const WHEN_SUGGESTIONS = ['Tonight', 'Tomorrow evening', 'This Friday evening', 'This Saturday', 'This weekend'];

// ─── Helpers ──────────────────────────────────────────────
function getMoodEmoji(mood: DateMood): string {
  return MOODS.find((m) => m.id === mood)?.emoji || '✨';
}

function getCategoryIcon(category: string): string {
  const map: Record<string, string> = { food: '🍽️', activity: '🎯', entertainment: '🎭', relaxation: '🧘' };
  return map[category] || '📍';
}

// ─── Memoized chips (performance) ────────────────────────
const MoodChip = React.memo(function MoodChip({
  item,
  selected,
  moodId,
  onToggle,
  theme,
}: {
  item: { id: DateMood; emoji: string; label: string; desc: string };
  selected: boolean;
  moodId: DateMood;
  onToggle: (id: DateMood) => void;
  theme: Record<string, unknown>;
}) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(moodId)}
      activeOpacity={0.85}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${item.label}: ${item.desc}`}
      style={[s.moodCard, {
        backgroundColor: selected ? theme.accent.primary + '10' : theme.bg.card,
        borderColor: selected ? theme.accent.primary : theme.border,
      }]}
    >
      <AppText style={{ fontSize: 24 }}>{item.emoji}</AppText>
      <AppText variant="label" style={{
        marginTop: 6,
        fontSize: 13,
        color: selected ? theme.accent.primary : theme.text.primary,
      }}>{item.label}</AppText>
      <AppText style={{
        fontSize: 10,
        color: selected ? theme.accent.primary : theme.text.tertiary,
        marginTop: 2,
        textAlign: 'center',
      }}>{item.desc}</AppText>
      {selected && (
        <View style={[s.moodCheck, { backgroundColor: theme.accent.primary }]}>
          <Feather name="check" size={10} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
});
MoodChip.displayName = 'MoodChip';

// ─── Screen ───────────────────────────────────────────────
export default function AIDatePlannerScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  // State
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Planning your perfect date...');
  const [datePlan, setDatePlan] = useState<DatePlan | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  // Form
  const [date, setDate] = useState('This Friday evening');
  const [budget, setBudget] = useState(100);
  const [moods, setMoods] = useState<DateMood[]>(['romantic']);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(10);
  const [customBudget, setCustomBudget] = useState('');
  const [showCustomBudget, setShowCustomBudget] = useState(false);

  const isMountedRef = useRef(true);
  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, []);

  // ─── Multi-select mood ───────────────────────────────────
  const toggleMood = useCallback((id: DateMood) => {
    haptics.light();
    setMoods((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((m) => m !== id);
      }
      return [...prev, id];
    });
  }, []);

  // ─── Date parsing ────────────────────────────────────────
  const parseUserDate = (dateStr: string): Date => {
    const lower = dateStr.trim().toLowerCase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
    const dow = today.getDay();
    if (lower.includes('today') || lower.includes('tonight')) return today;
    if (lower.includes('tomorrow')) { const d = new Date(today); d.setDate(d.getDate() + 1); return d; }
    const dayMap: Record<string, number> = {
      sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2,
      wednesday: 3, wed: 3, thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
    };
    for (const [name, target] of Object.entries(dayMap)) {
      if (lower.includes(name)) {
        const diff = ((target - dow) + 7) % 7 || 7;
        const d = new Date(today); d.setDate(d.getDate() + diff); return d;
      }
    }
    const diff = ((5 - dow) + 7) % 7 || 7;
    const d = new Date(today); d.setDate(d.getDate() + diff); return d;
  };

  const resolveCityStateCountry = async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const first = results?.[0];
      return {
        city: first?.city || first?.subregion || first?.region || 'Unknown',
        state: first?.region || first?.subregion || '',
        country: first?.country || '',
      };
    } catch {
      return { city: 'Unknown', state: '', country: '' };
    }
  };

  // ─── Generate ─────────────────────────────────────────────
  const generatePlan = async () => {
    try {
      const pro = await isProUser();
      if (!pro) {
        const used = await getTodayUsageCount();
        if (used >= DAILY_LIMIT_FREE) {
          logEvent('ai_gate_hit', { used, limit: DAILY_LIMIT_FREE });
          openPaywall(navigation, { source: 'ai_date_planner', returnTo: 'AIDatePlanner' });
          return;
        }
      }
    } catch (e) {
        reportError('Settings.LoadNonFatal', e);
      }

    setLoading(true);
    const messages = [
      'Finding the perfect spots nearby...',
      'Checking what\'s in range...',
      'Planning your evening...',
      'Almost ready...',
    ];
    let idx = 0;
    setLoadingMessage(messages[0]);
    if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    messageIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % messages.length;
      if (isMountedRef.current) setLoadingMessage(messages[idx]);
    }, 3000);

    try {
      const location = await GooglePlacesService.getLocation();
      if (!location) {
        Alert.alert('Location Required', 'Please enable location services to get personalised recommendations.');
        throw new Error('no-location');
      }

      const place = await resolveCityStateCountry(location.latitude, location.longitude);
      const budgetValue = showCustomBudget ? parseInt(customBudget, 10) || budget : budget;
      const request: DatePlanRequest = {
        date,
        budget: budgetValue,
        mood: moods[0],
        moods,
        radiusKm,
        location: { ...place, lat: location.latitude, lng: location.longitude },
      };

      const plan = await AIDatePlannerService.generateDatePlan(request);
      if (isMountedRef.current) setDatePlan(plan);
    } catch (error: unknown) {
      if (error?.message !== 'no-location') {
        logError('ai_date_plan_generate_failed', error as Error, { screen: 'AIDatePlannerScreen' });
        Alert.alert('Oops!', 'Failed to generate date plan. Please try again.');
      }
    } finally {
      if (messageIntervalRef.current) { clearInterval(messageIntervalRef.current); messageIntervalRef.current = null; }
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!datePlan) return;
    setLoading(true);
    if (isMountedRef.current) setLoadingMessage('Creating a different plan...');
    try {
      const location = await GooglePlacesService.getLocation();
      if (!location) { Alert.alert('Location Required', 'Enable location services to regenerate.'); throw new Error('no-location'); }
      const place = await resolveCityStateCountry(location.latitude, location.longitude);
      const budgetValue = showCustomBudget ? parseInt(customBudget, 10) || budget : budget;
      const request: DatePlanRequest = {
        date, budget: budgetValue, mood: moods[0], moods, radiusKm,
        location: { ...place, lat: location.latitude, lng: location.longitude },
      };
      const newPlan = await AIDatePlannerService.regeneratePlan(datePlan, request);
      if (isMountedRef.current) setDatePlan(newPlan);
    } catch (error: unknown) {
      if (error?.message !== 'no-location') {
        logError('ai_date_plan_regenerate_failed', error as Error);
        Alert.alert('Error', 'Failed to regenerate. Please try again.');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleAcceptPlan = async () => {
    if (!datePlan) return;
    try {
      const baseDate = parseUserDate(date);
      baseDate.setHours(18, 0, 0, 0);
      for (const activity of datePlan.activities) {
        const timeParts = activity.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        const activityStart = new Date(baseDate);
        if (timeParts) {
          let hours = parseInt(timeParts[1], 10);
          const minutes = parseInt(timeParts[2], 10);
          const meridiem = timeParts[3].toUpperCase();
          if (meridiem === 'PM' && hours < 12) hours += 12;
          if (meridiem === 'AM' && hours === 12) hours = 0;
          activityStart.setHours(hours, minutes, 0, 0);
        }
        const yyyy = String(activityStart.getFullYear());
        const mm = String(activityStart.getMonth() + 1).padStart(2, '0');
        const dd = String(activityStart.getDate()).padStart(2, '0');
        const hh = String(activityStart.getHours()).padStart(2, '0');
        const min = String(activityStart.getMinutes()).padStart(2, '0');
        const durMin = Number.isFinite(activity.duration) && activity.duration > 0 ? activity.duration : 60;
        await CalendarService.addEvent({
          title: activity.title,
          description: `${activity.description}\n\nAI Date Plan: ${datePlan.title}`,
          location: `${activity.location.name}, ${activity.location.address}`,
          date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}`, durationMinutes: durMin,
          reminder: { enabled: true, minutesBefore: 60 }, color: null,
          sharedWith: [],
        });
      }
      Alert.alert('🗓 Date Plan Saved!', `${datePlan.activities.length} activities added to your calendar.`, [
        { text: 'View Calendar', onPress: () => navigation.goBack() }, { text: 'OK' },
      ]);
    } catch (error) {
      logError('ai_date_plan_accept_failed', error as Error);
      Alert.alert('Error', 'Could not save to calendar. Please try again.');
    }
  };

  // ─── Derived ──────────────────────────────────────────────
  const budgetValue = showCustomBudget ? (parseInt(customBudget, 10) || budget) : budget;
  const moodLabels = moods.map((m) => MOODS.find((x) => x.id === m)?.label || m);

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <Screen>
        <Header title="AI Date Planner" leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
        <View style={s.loadingWrap}>
          <View style={[s.loadingCircle, { borderColor: theme.accent.primary + '30' }]}>
            <ActivityIndicator size="large" color={theme.accent.primary} />
          </View>
          <AppText variant="label" style={{ marginTop: tokens.space.lg, textAlign: 'center' }}>{loadingMessage}</AppText>
          <AppText variant="caption" color="tertiary" style={{ marginTop: 6, textAlign: 'center' }}>Usually takes 15–20 seconds</AppText>
        </View>
      </Screen>
    );
  }

  // ─── Plan result ──────────────────────────────────────────
  if (datePlan) {
    return (
      <>
        <DatePlanView plan={datePlan} theme={theme}
          onRegenerate={handleRegenerate} onAccept={handleAcceptPlan}
          onShare={() => setShowShareCard(true)} onBack={() => setDatePlan(null)} />
        {showShareCard && <ShareCard plan={datePlan} visible={showShareCard} onClose={() => setShowShareCard(false)} />}
      </>
    );
  }

  // ─── Form ─────────────────────────────────────────────────
  return (
    <Screen>
      <Header
        title="AI Date Planner"
        subtitle="Personalised plans in seconds"
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { flexGrow: 1, paddingBottom: Math.max(insets.bottom, 24) + 160 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled contentInsetAdjustmentBehavior="automatic">

        {/* ── When ──────────────────────────────────────── */}
        <Card style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: theme.accent.primary + '15' }]}>
              <Feather name="calendar" size={14} color={theme.accent.primary} />
            </View>
            <AppText variant="label">When</AppText>
          </View>
          <Input value={date} onChangeText={setDate} placeholder="e.g. This Friday evening" autoCapitalize="sentences" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickChips}>
            {WHEN_SUGGESTIONS.map((w) => {
              const active = date.toLowerCase() === w.toLowerCase();
              return (
                <TouchableOpacity
                  key={w}
                  onPress={() => { setDate(w); haptics.light(); }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  style={[s.quickChip, {
                    backgroundColor: active ? theme.accent.primary : theme.bg.subtle,
                    borderColor: active ? theme.accent.primary : 'transparent',
                  }]}
                >
                  <AppText variant="caption" style={{
                    color: active ? '#FFF' : theme.text.secondary,
                    fontWeight: active ? '700' : '500',
                  }}>{w}</AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* ── Mood (multi-select) ───────────────────────── */}
        <Card style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: theme.accent.primary + '15' }]}>
              <Feather name="heart" size={14} color={theme.accent.primary} />
            </View>
            <AppText variant="label">Mood</AppText>
            {moods.length > 0 && (
              <View style={[s.countBadge, { backgroundColor: theme.accent.primary }]}>
                <AppText style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>{moods.length}</AppText>
              </View>
            )}
          </View>
          <AppText variant="caption" color="tertiary" style={{ marginBottom: 10 }}>
            Select one or more — we'll blend them into your plan.
          </AppText>

          {/*
            NOTE: Avoid WrapRow here.
            WrapRow adds an extra wrapper + margins, which can squeeze percentage-width cards on
            smaller Android devices causing the "vertical letters" look.
          */}
          <View style={s.moodGrid}>
            {MOODS.map((m) => {
              const active = moods.includes(m.id);
              return (
                <View key={m.id} style={s.moodCell}>
                  <MoodChip item={m} moodId={m.id} selected={active} onToggle={toggleMood} theme={theme} />
                </View>
              );
            })}
          </View>

          {moods.length > 1 && (
            <View style={[s.moodSummary, { backgroundColor: theme.accent.primary + '08' }]}>
              <AppText variant="caption" style={{ color: theme.accent.primary }}>
                {moods.map((m) => getMoodEmoji(m)).join('  ')}  {moodLabels.join(' + ')}
              </AppText>
            </View>
          )}
        </Card>

        {/* ── Budget ────────────────────────────────────── */}
        <Card style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: theme.accent.primary + '15' }]}>
              <Feather name="dollar-sign" size={14} color={theme.accent.primary} />
            </View>
            <AppText variant="label">Budget</AppText>
          </View>

          <View style={s.budgetGrid}>
            {BUDGET_PRESETS.map((b) => {
              const active = !showCustomBudget && budget === b.amount;
              return (
                <TouchableOpacity
                  key={b.amount}
                  onPress={() => { setBudget(b.amount); setShowCustomBudget(false); haptics.light(); }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[s.budgetCard, {
                    backgroundColor: active ? theme.accent.primary + '10' : theme.bg.subtle,
                    borderColor: active ? theme.accent.primary : theme.border,
                  }]}
                >
                  <Feather name={b.icon as string} size={18} color={active ? theme.accent.primary : theme.text.tertiary} />
                  <AppText variant="label" style={{
                    marginTop: 6,
                    color: active ? theme.accent.primary : theme.text.primary,
                  }}>{b.label}</AppText>
                  <AppText style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 2 }}>{b.desc}</AppText>
                  {active && (
                    <View style={[s.budgetCheckDot, { backgroundColor: theme.accent.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => { setShowCustomBudget(!showCustomBudget); haptics.light(); }}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[s.customToggle, {
              backgroundColor: showCustomBudget ? theme.accent.primary + '10' : 'transparent',
              borderColor: showCustomBudget ? theme.accent.primary : theme.border,
            }]}
          >
            <Feather name="edit-2" size={12} color={showCustomBudget ? theme.accent.primary : theme.text.tertiary} />
            <AppText variant="caption" style={{
              marginLeft: 6,
              color: showCustomBudget ? theme.accent.primary : theme.text.secondary,
              fontWeight: '600',
            }}>Custom amount</AppText>
          </TouchableOpacity>
          {showCustomBudget && (
            <Input
              value={customBudget}
              onChangeText={setCustomBudget}
              placeholder="Enter amount"
              keyboardType="number-pad"
              style={{ marginTop: 8 }}
            />
          )}
        </Card>

        {/* ── Search Radius ─────────────────────────────── */}
        <Card style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: theme.accent.primary + '15' }]}>
              <Feather name="map-pin" size={14} color={theme.accent.primary} />
            </View>
            <AppText variant="label">Search radius</AppText>
          </View>
          <AppText variant="caption" color="tertiary" style={{ marginBottom: 10 }}>
            How far from your location to look for venues
          </AppText>
          <View style={s.radiusRow}>
            {RADIUS_OPTIONS.map((r) => {
              const active = radiusKm === r.km;
              return (
                <TouchableOpacity
                  key={r.km}
                  onPress={() => { setRadiusKm(r.km as RadiusKm); haptics.light(); }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[s.radiusCard, {
                    backgroundColor: active ? theme.accent.primary + '10' : theme.bg.subtle,
                    borderColor: active ? theme.accent.primary : theme.border,
                  }]}
                >
                  <AppText variant="label" style={{
                    color: active ? theme.accent.primary : theme.text.primary,
                    fontSize: 14,
                  }}>{r.label}</AppText>
                  <AppText style={{ fontSize: 10, color: theme.text.tertiary, marginTop: 2 }}>{r.desc}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ── Summary + Generate ────────────────────────── */}
        <Card style={[s.section, s.summaryCard]}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <AppText variant="caption" color="tertiary">When</AppText>
              <AppText variant="bodySm" style={{ fontWeight: '600', marginTop: 2 }} numberOfLines={1}>{date}</AppText>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: theme.divider }]} />
            <View style={s.summaryItem}>
              <AppText variant="caption" color="tertiary">Mood</AppText>
              <AppText style={{ marginTop: 2 }}>{moods.map((m) => getMoodEmoji(m)).join(' ')}</AppText>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: theme.divider }]} />
            <View style={s.summaryItem}>
              <AppText variant="caption" color="tertiary">Budget</AppText>
              <AppText variant="bodySm" style={{ fontWeight: '600', marginTop: 2 }}>${budgetValue}</AppText>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: theme.divider }]} />
            <View style={s.summaryItem}>
              <AppText variant="caption" color="tertiary">Radius</AppText>
              <AppText variant="bodySm" style={{ fontWeight: '600', marginTop: 2 }}>{radiusKm} km</AppText>
            </View>
          </View>
        </Card>

        <TouchableOpacity
          onPress={generatePlan}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={[s.generateBtn, { backgroundColor: theme.accent.primary }]}
        >
          <Feather name="zap" size={18} color="#FFF" />
          <AppText style={s.generateBtnText}>Generate plan</AppText>
        </TouchableOpacity>

        <AppText variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: tokens.space.sm }}>
          Suggestions only — confirm reservations/availability.
        </AppText>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

// ─── Plan Result View ─────────────────────────────────────
function DatePlanView({ plan, theme, onRegenerate, onAccept, onShare, onBack }: {
  plan: DatePlan; theme: Record<string, unknown>; onRegenerate: () => void; onAccept: () => void; onShare: () => void; onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <Header title={plan.title} subtitle={plan.description}
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: onBack }}
        rightAction={{ icon: 'share-2', label: 'Share', onPress: onShare }} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { flexGrow: 1, paddingBottom: Math.max(insets.bottom, 24) + 160 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled contentInsetAdjustmentBehavior="automatic">
        {/* Stats */}
        <Card>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <AppText variant="heading">${plan.totalCost}</AppText>
              <AppText variant="caption" color="secondary">Total</AppText>
            </View>
            <View style={s.statItem}>
              <AppText variant="heading">{Math.round(plan.totalDuration / 60)}h</AppText>
              <AppText variant="caption" color="secondary">Duration</AppText>
            </View>
            <View style={s.statItem}>
              <AppText variant="heading">{plan.activities.length}</AppText>
              <AppText variant="caption" color="secondary">Stops</AppText>
            </View>
          </View>
        </Card>

        <View style={{ height: tokens.space.base }} />

        {/* Timeline */}
        <SmartList
          data={plan.activities}
          keyExtractor={(item, index) => `${item.time}-${index}`}
          estimatedItemSize={220}
          scrollEnabled={false}
          renderItem={({ item: a, index: idx }) => (
            <Card style={{ marginBottom: tokens.space.md }}>
              <View style={s.activityTop}>
                <View style={[s.timePill, { backgroundColor: theme.accent.light, borderColor: theme.accent.primary }]}>
                  <AppText variant="label" style={{ color: theme.accent.primary }}>{a.time}</AppText>
                </View>
                <AppText variant="label" color="secondary">${a.cost}</AppText>
              </View>
              <AppText variant="heading" style={{ marginTop: 8 }}>{a.title}</AppText>
              <AppText variant="body" color="secondary" style={{ marginTop: 6, lineHeight: 22 }}>{a.description}</AppText>
              <View style={{ marginTop: tokens.space.base }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="map-pin" size={12} color={theme.text.tertiary} />
                  <AppText variant="caption" color="secondary" style={{ marginLeft: 4 }}>{a.location.name}</AppText>
                </View>
                {!!a.location.address && (
                  <AppText variant="caption" color="tertiary" style={{ marginTop: 2, marginLeft: 16 }}>{a.location.address}</AppText>
                )}
              </View>
              <WrapRow spacing={12} style={s.metaRow}>
                <View style={s.metaItem}>
                  <Feather name="clock" size={11} color={theme.text.tertiary} />
                  <AppText variant="caption" color="secondary" style={{ marginLeft: 4 }}>{a.duration} min</AppText>
                </View>
                <View style={s.metaItem}>
                  <AppText variant="caption" color="secondary">{getCategoryIcon(a.category)} {a.category}</AppText>
                </View>
                {a.bookingInfo?.requiresBooking && (
                  <View style={[s.bookingBadge, { backgroundColor: theme.warning + '15' }]}>
                    <AppText variant="caption" style={{ color: theme.warning, fontWeight: '600' }}>Booking needed</AppText>
                  </View>
                )}
              </WrapRow>
              {a.travelTimeFromPrevious ? (
                <View style={[s.travelBar, { backgroundColor: theme.bg.subtle, borderColor: theme.border }]}>
                  <Feather name="navigation" size={11} color={theme.text.tertiary} />
                  <AppText variant="caption" color="secondary" style={{ marginLeft: 6 }}>{a.travelTimeFromPrevious} min from previous stop</AppText>
                </View>
              ) : null}
            </Card>
          )}
        />

        <View style={{ height: tokens.space.sm }} />
        <Button title="Add to calendar" onPress={onAccept} size="lg" />
        <View style={{ height: tokens.space.sm }} />
        <Button title="Share this plan" onPress={onShare} variant="secondary" size="lg" />
        <View style={{ height: tokens.space.sm }} />
        <Button title="Try a different plan" onPress={onRegenerate} variant="secondary" size="lg" />
        <View style={{ height: tokens.space.xl }} />
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  content: { paddingHorizontal: tokens.space.lg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xl },
  loadingCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },

  // Sections
  section: { marginBottom: tokens.space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  countBadge: { marginLeft: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // When chips
  quickChips: { gap: 8, marginTop: tokens.space.sm, paddingBottom: 2 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: tokens.radius.pill, borderWidth: 1 },

  // Mood grid — 2-column, pixel widths
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodCell: { width: Math.floor((Dimensions.get('window').width - 24 * 2 - 20 * 2 - 10) / 2) },
  moodCard: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    ...tokens.shadow.sm,
  },
  moodCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  moodSummary: {
    marginTop: 10, padding: 10, borderRadius: tokens.radius.sm, alignItems: 'center',
  },

  // Budget
  budgetGrid: { flexDirection: 'row', gap: 8 },
  budgetCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  budgetCheckDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
  },
  customToggle: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: tokens.radius.pill, borderWidth: 1,
    marginTop: 10, alignSelf: 'flex-start',
  },

  // Radius
  radiusRow: { flexDirection: 'row', gap: 10 },
  radiusCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },

  // Summary
  summaryCard: { marginBottom: 0 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 28, marginHorizontal: 4 },

  // Generate
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: tokens.radius.lg, marginTop: tokens.space.md,
  },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  // Plan view
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  activityTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timePill: { borderWidth: 1, borderRadius: tokens.radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: tokens.space.base, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  bookingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: tokens.radius.pill },
  travelBar: {
    borderWidth: 1, borderRadius: tokens.radius.md,
    paddingVertical: 10, paddingHorizontal: 12,
    marginTop: tokens.space.base, flexDirection: 'row', alignItems: 'center',
  },
});