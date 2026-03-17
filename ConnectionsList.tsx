/**
 * WeeklyReportScreen — Intelligence (Premium Couples Experience)
 *
 * Revamped for a focused, streamlined, professional feel.
 * One snapshot → everything rendered beautifully.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, Dimensions, Share, TouchableOpacity, RefreshControl } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Button from '../ui/components/Button';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import { getSnapshot } from '../services/SnapshotService';
import CalendarService from '../services/CalendarService';
import { logError } from '../services/logger';

// ── Premium Hero Score Component ───────────────────────────────

function PremiumHeroScore({ score, level, message, trend, theme }) {
  const safeScore = (typeof score === 'number' && !isNaN(score)) ? Math.round(score) : 0;
  
  // Softer, more premium gradients
  const gradientColors = safeScore >= 85 ? theme.semantic.gradientPositive :
    safeScore >= 70 ? theme.semantic.gradientNeutral :
    safeScore >= 55 ? theme.semantic.gradientWarm :
    theme.semantic.gradientUrgent;

  return (
    <Card style={st.heroCard}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.heroGradient}
      >
        <View style={st.heroContent}>
          <View style={st.heroLeft}>
            <View style={st.heroScoreWrap}>
              <AppText style={st.heroScoreNumber}>{safeScore}</AppText>
              <AppText style={st.heroScoreLabel}>Health</AppText>
            </View>
          </View>
          
          <View style={st.heroRight}>
            <AppText style={st.heroLevel}>{level || 'Healthy'}</AppText>
            <AppText style={st.heroMessage} numberOfLines={2}>{message}</AppText>
            
            {trend && trend.direction !== 'stable' && (
              <View style={st.heroTrend}>
                <Feather 
                  name={trend.direction === 'up' ? 'trending-up' : 'trending-down'} 
                  size={14} 
                  color="rgba(255,255,255,0.9)" 
                />
                <AppText style={st.heroTrendText}>
                  {trend.direction === 'up' ? '+' : ''}{trend.change}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Card>
  );
}

// ── Compact Metric Row ─────────────────────────────────────────

const CompactMetric = React.memo(function CompactMetric({ icon, label, value, color, theme }) {
  return (
    <View style={st.compactMetric}>
      <View style={[st.compactIcon, { backgroundColor: color + '15' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <View style={st.compactContent}>
        <AppText variant="caption" color="tertiary" style={st.compactLabel}>
          {label}
        </AppText>
        <AppText variant="label" style={{ color: theme.text.primary }}>
          {value}
        </AppText>
      </View>
    </View>
  );
});

// ── Insight Card (Streamlined) ─────────────────────────────────

function InsightCard({ icon, title, body, color, theme, onPress }: { icon: string; title: string; body: string; color: string; theme: Record<string, unknown>; onPress?: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[st.insightCard, { backgroundColor: theme.bg.card }]}
    >
      <View style={[st.insightIconWrap, { backgroundColor: color + '12' }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={st.insightContent}>
        <AppText variant="label" style={{ color: theme.text.primary }}>
          {title}
        </AppText>
        <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
          {body}
        </AppText>
      </View>
      {onPress && (
        <Feather name="chevron-right" size={18} color={theme.text.tertiary} />
      )}
    </TouchableOpacity>
  );
}

function DateCard({ idea, slot, partner, theme, navigation }) {
  if (!idea) return null;

  const VIBE_ICONS = { romantic: 'heart', cozy: 'coffee', playful: 'smile', adventurous: 'compass', thoughtful: 'book' };
  const vibeIcon = VIBE_ICONS[idea.vibe] || 'star';

  const formatSlot = (s: { day?: string; time?: string } | null) => {
    try {
      const d = new Date(s.date + 'T00:00:00');
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + s.time;
    } catch { return s.date + ' ' + s.time; }
  };

  const book = async () => {
    if (!slot || !partner) return;
    const ev = await CalendarService.addEvent({
      title: idea.title,
      date: slot.date,
      time: slot.time,
      durationMinutes: idea.durationMins || 90,
      description: idea.details + '\n\nSuggested by U&Me intelligence',
      sharedWith: [partner.id],
    });
    haptics.success();
    navigation.navigate('EventDetails', { event: ev });
  };

  return (
    <Card style={st.mt14}>
      <AppText variant="caption" color="tertiary" style={st.ls05}>RECOMMENDED DATE</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <View style={[st.dateIcon, { backgroundColor: theme.accent.primary + '15' }]}>
          <Feather name={vibeIcon} size={18} color={theme.accent.primary} />
        </View>
        <View style={st.bodyCol}>
          <AppText style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }} numberOfLines={2}>{idea.title}</AppText>
          <AppText variant="caption" color="secondary" style={st.mt2}>{idea.vibe} · ~{idea.durationMins || 90} mins</AppText>
        </View>
      </View>
      <AppText variant="bodySm" color="secondary" style={{ marginTop: 8, lineHeight: 20 }}>{idea.details}</AppText>

      {slot && (
        <View style={[st.slotChip, { backgroundColor: theme.bg.subtle, borderColor: theme.divider }]}>
          <Feather name="clock" size={12} color={theme.text.tertiary} />
          <AppText variant="caption" color="secondary" style={{ marginLeft: 6 }}>Free slot: {formatSlot(slot)}</AppText>
        </View>
      )}

      <View style={st.mt12}>
        <Button title={slot ? 'Book it' : 'Find a slot'} onPress={slot ? book : () => navigation.navigate('AutoSchedule')} />
      </View>
    </Card>
  );
}

function MetricRow({ label, value, theme }) {
  return (
    <View style={st.metricRow}>
      <AppText style={{ color: theme.text.tertiary, flex: 1 }}>{label}</AppText>
      <AppText style={{ color: theme.text.primary, fontWeight: '700' }}>{value}</AppText>
    </View>
  );
}

function BreakdownBar({ label, value, theme }) {
  const w = Math.max(4, value);
  return (
    <View style={st.mt10}>
      <View style={st.metricRow}>
        <AppText variant="bodySm" color="secondary">{label}</AppText>
        <AppText variant="bodySm" color="secondary">{value}%</AppText>
      </View>
      <View style={[st.barTrack, { backgroundColor: theme.bg.muted }]}>
        <View style={[st.barFill, { width: `${w}%`, backgroundColor: value >= 70 ? theme.success : value >= 40 ? theme.accent.primary : theme.error }]} />
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────

export default function WeeklyReportScreen({ navigation }: { navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [snap, setSnap] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getSnapshot({ days: 7 });
      setSnap(s);
    } catch (e) { logError('WeeklyReportScreen', e); }
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  // Share
  const reportText = snap?.weeklyReportText || '';
  const onShare = useCallback(async () => {
    if (!reportText) return;
    haptics.light();
    try { await Share.share({ title: 'Weekly Couple Report', message: reportText.trim() }); } catch (e) { logError('WeeklyReportScreen', e); }
  }, [reportText]);

  const onCopy = useCallback(async () => {
    if (!reportText) return;
    await Clipboard.setStringAsync(reportText.trim());
    haptics.light();
  }, [reportText]);

  // Loading state
  if (loading || !snap) {
    return (
      <Screen>
        <Header title="Intelligence" leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) + 120 }}>
          <Card><AppText color="secondary">Analysing your week…</AppText></Card>
        </ScrollView>
      </Screen>
    );
  }

  // No partner
  if (!snap.hasPartner) {
    return (
      <Screen>
        <Header title="Intelligence" leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) + 120 }}>
          <Card>
            <AppText style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }} numberOfLines={2}>Connect a partner to unlock this.</AppText>
            <AppText style={{ marginTop: 8, color: theme.text.secondary }}>
              Weekly intelligence summarises balance, effort patterns, and risks — private to you two.
            </AppText>
            <View style={st.mt14}>
              <Button title="Go to Connections" onPress={() => navigation.navigate('MainTabs', { screen: 'Connections' })} />
            </View>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  const { health, conflict, partner, weekly, shares, pulseTrend, recommendedAction, recommendedDate, freeSlot } = snap;
  const firstName = partner?.firstName || 'Partner';
  const w = weekly || {};

  return (
    <Screen>
      <Header
        title="Intelligence"
        subtitle={`${firstName} · ${snap.balancePct}% balanced`}
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        rightAction={{ icon: 'refresh-cw', onPress: () => { haptics.light(); load(); } }}
      />

      <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} />} contentContainerStyle={[st.container, { paddingBottom: Math.max(insets.bottom, 24) + 160 }]} showsVerticalScrollIndicator={false}>

        {/* ═══ PREMIUM HERO ═══ */}
        <PremiumHeroScore
          score={health.score}
          level={health.level}
          message={health.message}
          trend={health.trend}
          theme={theme}
        />

        {/* ═══ KEY INSIGHTS GRID ═══ */}
        <View style={st.insightsGrid}>
          <CompactMetric
            icon="calendar"
            label="Plans This Week"
            value={`${w.sharedPlans || 0}`}
            color="#7C3AED"
            theme={theme}
          />
          <CompactMetric
            icon="percent"
            label="Balance"
            value={`${snap.balancePct}%`}
            color="#059669"
            theme={theme}
          />
          <CompactMetric
            icon="zap"
            label="Streak"
            value={w.streakDays > 0 ? `${w.streakDays} days` : 'None'}
            color="#D97706"
            theme={theme}
          />
          <CompactMetric
            icon="heart"
            label="Health"
            value={health.level || 'Good'}
            color="#EC4899"
            theme={theme}
          />
        </View>

        {/* ═══ RECOMMENDED ACTION (IF EXISTS) ═══ */}
        {recommendedAction && (
          <InsightCard
            icon={recommendedAction.icon || 'lightbulb'}
            title={recommendedAction.title}
            body={recommendedAction.body}
            color={theme.accent.primary}
            theme={theme}
          />
        )}

        {/* ═══ EFFORT BREAKDOWN (STREAMLINED) ═══ */}
        <Card style={st.sectionCard}>
          <View style={st.sectionHeader}>
            <Feather name="users" size={18} color={theme.accent.primary} />
            <AppText variant="h3" style={{ marginLeft: 10 }}>Effort Split</AppText>
          </View>
          
          <View style={st.effortGrid}>
            <View style={st.effortItem}>
              <AppText variant="caption" color="tertiary">Planning</AppText>
              <AppText variant="h2" style={{ marginTop: 4 }}>
                {Math.round((shares?.planningShare || 0) * 100)}%
              </AppText>
            </View>
            <View style={st.effortItem}>
              <AppText variant="caption" color="tertiary">Initiative</AppText>
              <AppText variant="h2" style={{ marginTop: 4 }}>
                {Math.round((shares?.initiativeShare || 0) * 100)}%
              </AppText>
            </View>
            <View style={st.effortItem}>
              <AppText variant="caption" color="tertiary">Cooperation</AppText>
              <AppText variant="h2" style={{ marginTop: 4 }}>
                {Math.round((shares?.coopShare || 0) * 100)}%
              </AppText>
            </View>
          </View>
        </Card>

        {/* ═══ EMOTIONAL PULSE (IF TRACKED) ═══ */}
        {pulseTrend?.daysAnswered > 0 && (
          <InsightCard
            icon={pulseTrend.trend === 'rising' ? 'trending-up' : pulseTrend.trend === 'falling' ? 'trending-down' : 'minus'}
            title="Emotional Pulse"
            body={
              pulseTrend.trend === 'rising' ? 'Feeling closer this week — that\'s real progress.'
                : pulseTrend.trend === 'falling' ? 'Connection dipped. A check-in tonight could help.'
                : `Steady rhythm (${pulseTrend.daysAnswered} day${pulseTrend.daysAnswered === 1 ? '' : 's'} tracked).`
            }
            color={pulseTrend.trend === 'rising' ? '#059669' : pulseTrend.trend === 'falling' ? '#DC2626' : theme.text.tertiary}
            theme={theme}
          />
        )}

        {/* ═══ RECOMMENDED DATE (IF EXISTS) ═══ */}
        {recommendedDate && (
          <Card style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <Feather name="coffee" size={18} color={theme.accent.primary} />
              <AppText variant="h3" style={{ marginLeft: 10 }}>Suggested Date</AppText>
            </View>
            <AppText variant="body" color="secondary" style={{ marginTop: 8 }}>
              {recommendedDate.title}
            </AppText>
            {freeSlot && (
              <AppText variant="caption" color="tertiary" style={{ marginTop: 4 }}>
                Free slot: {freeSlot.date} at {freeSlot.time}
              </AppText>
            )}
            <View style={{ marginTop: 12 }}>
              <Button
                title="Schedule This"
                onPress={() => navigation.navigate('AddEvent', {
                  selectedDate: freeSlot?.date,
                  prefilledTitle: recommendedDate.title
                })}
                size="sm"
              />
            </View>
          </Card>
        )}

        {/* ═══ FRICTION SIGNALS (ONLY IF EXISTS) ═══ */}
        {(w?.lastMinute?.lateCancels?.you > 0 || w?.lastMinute?.lateCancels?.partner > 0 ||
          w?.lastMinute?.lateReschedules?.you > 0 || w?.lastMinute?.lateReschedules?.partner > 0) && (
          <Card style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <Feather name="alert-circle" size={18} color="#F59E0B" />
              <AppText variant="h3" style={{ marginLeft: 10 }}>Friction This Week</AppText>
            </View>
            <View style={{ marginTop: 12, gap: 8 }}>
              {(w.lastMinute.lateCancels?.you > 0 || w.lastMinute.lateCancels?.partner > 0) && (
                <View style={st.frictionRow}>
                  <AppText variant="caption" color="secondary" style={{ flex: 1 }}>
                    Late cancels
                  </AppText>
                  <AppText variant="caption" color="tertiary">
                    You: {w.lastMinute.lateCancels?.you ?? 0} · {firstName}: {w.lastMinute.lateCancels?.partner ?? 0}
                  </AppText>
                </View>
              )}
              {(w.lastMinute.lateReschedules?.you > 0 || w.lastMinute.lateReschedules?.partner > 0) && (
                <View style={st.frictionRow}>
                  <AppText variant="caption" color="secondary" style={{ flex: 1 }}>
                    Late reschedules
                  </AppText>
                  <AppText variant="caption" color="tertiary">
                    You: {w.lastMinute.lateReschedules?.you ?? 0} · {firstName}: {w.lastMinute.lateReschedules?.partner ?? 0}
                  </AppText>
                </View>
              )}
            </View>

            {snap.tension?.length > 0 && (
              <View style={st.mt12}>
                {snap.tension.slice(0, 2).map((t) => (
                  <View key={t.title} style={[st.tensionPill, { backgroundColor: theme.bg.subtle, borderColor: theme.divider }]}
                  >
                    <AppText variant="bodySm" style={{ fontWeight: '600' }}>{t.title}</AppText>
                    <AppText variant="caption" color="secondary" style={st.mt2}>{t.body}</AppText>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* ═══ SHARE ═══ */}
        <Card style={st.mt14}>
          <AppText style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }} numberOfLines={2}>Share this report</AppText>
          <AppText variant="bodySm" color="secondary" style={st.mt4}>Send to your partner or keep for yourself.</AppText>

          <View style={st.shareRow}>
            <View style={st.flex1}>
              <Button title="Share" onPress={onShare} />
            </View>
            <View style={st.flex1}>
              <Button variant="secondary" title="Copy" onPress={onCopy} />
            </View>
          </View>
        </Card>

        {/* ═══ DEEP DIVE LINKS ═══ */}
        <Card padded={false} style={st.mt14}>
          {[
            { label: 'Health Score details', icon: 'activity', route: 'HealthScore' },
            { label: 'Conflict predictor', icon: 'shield', route: 'ConflictPredictor' },
            { label: 'Relationship Engine', icon: 'heart', route: 'RelationshipEngine' },
          ].map((item, idx) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={item.route}
              onPress={() => {
                haptics.light();
                navigation.navigate(item.route);
              }}
              activeOpacity={0.8}
              style={[st.deepLink, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider }]}
        >
              <Feather name={item.icon} size={16} color={theme.text.secondary} />
              <AppText variant="body" style={st.bodyCol}>{item.label}</AppText>
              <Feather name="chevron-right" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

// ── Styles ──────────────────────────────────────────────────

const st = StyleSheet.create({
  container: {
    padding: tokens.space.base,
    paddingBottom: tokens.space.huge,
  },
  
  // Premium Hero Card
  heroCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: tokens.space.lg,
  },
  heroGradient: {
    padding: tokens.space.xl,
    borderRadius: tokens.radius.lg,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.lg,
  },
  heroLeft: {
    alignItems: 'center',
  },
  heroScoreWrap: {
    alignItems: 'center',
  },
  heroScoreNumber: {
    fontSize: 48,
    fontWeight: tokens.type.weight.heavy,
    color: '#FFFFFF',
    lineHeight: 52,
  },
  heroScoreLabel: {
    fontSize: tokens.type.size.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: tokens.type.weight.semi,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  heroRight: {
    flex: 1,
  },
  heroLevel: {
    fontSize: tokens.type.size.lg,
    fontWeight: tokens.type.weight.bold,
    color: '#FFFFFF',
  },
  heroMessage: {
    fontSize: tokens.type.size.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    lineHeight: 18,
  },
  heroTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  heroTrendText: {
    fontSize: tokens.type.size.xs,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: tokens.type.weight.semi,
  },
  
  // Insights Grid
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: tokens.space.lg,
  },
  compactMetric: {
    width: (Dimensions.get('window').width - tokens.space.lg * 2 - 40) / 2,
    padding: 4,
  },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.sm,
  },
  compactContent: {
    paddingLeft: 2,
  },
  compactLabel: {
    fontSize: tokens.type.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Insight Card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.sm,
    ...tokens.shadow.sm,
  },
  insightIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  insightContent: {
    flex: 1,
  },
  
  // Section Cards
  sectionCard: {
    marginBottom: tokens.space.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Effort Grid
  effortGrid: {
    flexDirection: 'row',
    marginTop: tokens.space.md,
    gap: tokens.space.md,
  },
  effortItem: {
    flex: 1,
    alignItems: 'center',
    padding: tokens.space.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: tokens.radius.md,
  },
  
  // Friction Row
  frictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  
  // Share Button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    gap: 8,
  },

  // ── Utilities ─────────────────────────────────────────────
  mt2:  { marginTop: 2 },
  mt4:  { marginTop: 4 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  mt14: { marginTop: 14 },
  flex1: { flex: 1 },
  ls05: { letterSpacing: 0.5 },

  // ── Metric row ────────────────────────────────────────────
  metricRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },

  // ── Progress bar ──────────────────────────────────────────
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  barFill:  { height: 8, borderRadius: 4 },

  // ── Date idea card ────────────────────────────────────────
  dateIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bodyCol:  { flex: 1, minWidth: 0 },
  slotChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10,
  },

  // ── Tension pill ──────────────────────────────────────────
  tensionPill: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },

  // ── Share row ─────────────────────────────────────────────
  shareRow: { flexDirection: 'row', gap: 10, marginTop: 12 },

  // ── Deep-link row ─────────────────────────────────────────
  deepLink: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
});
