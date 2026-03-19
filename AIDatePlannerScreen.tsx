import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { ScrollView, View, StyleSheet, Dimensions, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import SectionHeader from '../ui/components/SectionHeader';
import Button from '../ui/components/Button';
import ScoreRing from '../ui/components/ScoreRing';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { getSnapshot } from '../services/SnapshotService';
import { logEvent } from '../services/Telemetry';
import { tokens } from '../config/tokens';
import { getFirstName } from '../utils/partners';

// Hero Score Card Component
function HeroScoreCard({ value, theme }) {
  // Default to 0 so brand-new accounts don't show a misleading 50% balance.
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const pct = Math.round(Math.max(0, Math.min(1, safeValue)) * 100);
  
  const status = pct >= 85 ? 'excellent' : pct >= 70 ? 'balanced' : pct >= 55 ? 'fair' : 'needs-attention';
  
  const statusConfig = {
    'excellent': {
      gradient: theme.semantic.gradientPositive,
      icon: 'award',
      title: 'Excellent Balance',
      subtitle: "You're in sync",
      emoji: '✨'
    },
    'balanced': {
      gradient: theme.semantic.gradientNeutral,
      icon: 'check-circle',
      title: 'Well Balanced',
      subtitle: 'Things are flowing',
      emoji: '💚'
    },
    'fair': {
      gradient: theme.semantic.gradientWarm,
      icon: 'trending-up',
      title: 'Room to Improve',
      subtitle: 'Small adjustments help',
      emoji: '🌱'
    },
    'needs-attention': {
      gradient: theme.semantic.gradientUrgent,
      icon: 'heart',
      title: 'Needs Attention',
      subtitle: 'Time to reconnect',
      emoji: '💌'
    }
  };

  const config = statusConfig[status];

  return (
    <Card style={st.heroCard}>
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.heroGradient}
      >
        <View style={st.heroContent}>
          <View style={st.heroLeft}>
            <AppText style={st.heroEmoji}>{config.emoji}</AppText>
            <View style={st.heroText}>
              <AppText style={st.heroTitle}>{config.title}</AppText>
              <AppText style={st.heroSubtitle}>{config.subtitle}</AppText>
            </View>
          </View>
          
          <View style={st.heroScore}>
            <AppText style={st.heroScoreNumber}>{pct}</AppText>
            <AppText style={st.heroScoreLabel}>Balance</AppText>
          </View>
        </View>
      </LinearGradient>
    </Card>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, maxValue = 100, color, theme }) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const percentage = Math.round((safeValue / maxValue) * 100);
  
  return (
    <View style={[st.metricCard, { backgroundColor: theme.bg.card }]}>
      <View style={[st.metricIconWrap, { backgroundColor: color + '15' }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <AppText variant="caption" color="tertiary" style={st.metricLabel}>
        {label}
      </AppText>
      <AppText variant="h2" style={{ color: theme.text.primary, marginTop: 4 }}>
        {percentage}%
      </AppText>
      <View style={[st.metricBar, { backgroundColor: theme.bg.muted }]}>
        <View style={[st.metricBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// Insight Card Component
function InsightCard({ icon, title, body, action, onPress, theme }: { icon: string; title: string; body: string; action?: string; onPress?: () => void; theme: Record<string, unknown> }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={onPress}
      style={[st.insightCard, { backgroundColor: theme.bg.card }]}
    >
      <View style={[st.insightIconWrap, { backgroundColor: theme.accent.primary + '12' }]}>
        <Feather name={icon} size={18} color={theme.accent.primary} />
      </View>
      <View style={st.insightContent}>
        <AppText variant="label" style={{ color: theme.text.primary }}>
          {title}
        </AppText>
        <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
          {body}
        </AppText>
      </View>
      {action && (
        <Feather name="arrow-right" size={18} color={theme.text.tertiary} />
      )}
    </TouchableOpacity>
  );
}

// Compact Action Button
function ActionButton({ icon, label, onPress, variant = 'primary', theme }) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        st.actionButton,
        {
          backgroundColor: isPrimary ? theme.accent.primary : theme.bg.card,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: theme.border,
        }
      ]}
    >
      <View style={[
        st.actionIconWrap,
        { backgroundColor: isPrimary ? 'rgba(255,255,255,0.2)' : theme.accent.primary + '12' }
      ]}>
        <Feather
          name={icon}
          size={18}
          color={isPrimary ? '#FFFFFF' : theme.accent.primary}
        />
      </View>
      <AppText
        variant="label"
        style={{
          color: isPrimary ? '#FFFFFF' : theme.text.primary,
          marginLeft: 10,
          flex: 1
        }}
      >
        {label}
      </AppText>
      <Feather
        name="chevron-right"
        size={18}
        color={isPrimary ? 'rgba(255,255,255,0.7)' : theme.text.tertiary}
      />
    </TouchableOpacity>
  );
}

const TensionRow = memo(function TensionRow({ item, theme }: { item: { label: string; score: number; icon?: string }; theme: Record<string, unknown> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: tokens.space.sm }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color || theme.warning, marginRight: tokens.space.md }} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodySm">{item.label}</AppText>
        {item.hint && <AppText variant="caption" color="secondary" style={{ marginTop: 1 }}>{item.hint}</AppText>}
      </View>
    </View>
  );
});

export default function RelationshipEngineScreen({ navigation }: { navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const d = await getSnapshot({ days: 7 });
      setData(d);
    } catch (error) {
      logEvent('relationship_engine_load_error', { message: String(error) });
      Alert.alert('Couldn\'t load', 'Please check your connection and try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const weeklyLine = useMemo(() => {
    if (!data?.weekly) return null;
    const w = data.weekly;
    const bits = [];
    bits.push(`${w.sharedPlans} plan${w.sharedPlans===1?'':'s'} this week`);
    if (w.alignment) bits.push(w.alignment);
    return bits.join(' • ');
  }, [data]);

  // Loading State
  if (!data) {
    return (
      <Screen>
        <Header 
          title="Relationship Engine" 
          leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} 
        />
        <ScrollView style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.accent.primary} />} contentContainerStyle={[st.container, { paddingBottom: Math.max(insets.bottom, 24) + 140 }]}>
          <View style={[st.loadingCard, { backgroundColor: theme.bg.card }]}>
            <AppText variant="body" color="secondary">Loading your insights...</AppText>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // No Partner State
  if (!data.hasPartner) {
    return (
      <Screen>
        <Header 
          title="Relationship Engine" 
          leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} 
        />
        <ScrollView style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.accent.primary} />} contentContainerStyle={[st.container, { paddingBottom: Math.max(insets.bottom, 24) + 140 }]}>
          <Card style={st.emptyCard}>
            <View style={[st.emptyIcon, { backgroundColor: theme.accent.primary + '12' }]}>
              <Feather name="heart" size={24} color={theme.accent.primary} />
            </View>
            <AppText variant="h2" style={{ textAlign: 'center', marginTop: 20 }}>
              Connect with your partner
            </AppText>
            <AppText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: 8 }}>
              The Relationship Engine analyzes shared plans and gently reflects balance — nothing public, just insights for you two.
            </AppText>
            <View style={st.mt20}>
              <Button 
                title="Go to Connections" 
                onPress={() => navigation.navigate('MainTabs', { screen: 'Connections' })} 
              />
            </View>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  const partnerName = getFirstName(data.partner?.name, 'Partner');

  return (
    <Screen>
      <Header
        title="Relationship Engine"
        subtitle={partnerName}
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        rightAction={{ 
          icon:'refresh-cw', 
          onPress: () => { haptics.light(); load(); },
          loading: refreshing 
        }}
      />
      
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.accent.primary} />} 
        contentContainerStyle={[st.container, { paddingBottom: Math.max(insets.bottom, 24) + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Score */}
        <HeroScoreCard value={data.balance} theme={theme} />

        {/* Metrics Grid */}
        <View style={st.metricsGrid}>
          <MetricCard
            icon="calendar"
            label="Planning"
            value={data.breakdown.planning}
            color="#7C3AED"
            theme={theme}
          />
          <MetricCard
            icon="zap"
            label="Initiative"
            value={data.breakdown.initiative}
            color="#EC4899"
            theme={theme}
          />
          <MetricCard
            icon="check-circle"
            label="Reliability"
            value={data.breakdown.reliability}
            color="#059669"
            theme={theme}
          />
          <MetricCard
            icon="users"
            label="Cooperation"
            value={data.breakdown.cooperation}
            color="#D97706"
            theme={theme}
          />
        </View>

        {/* This Week Summary */}
        <Card style={st.weekCard}>
          <View style={st.weekHeader}>
            <Feather name="calendar" size={20} color={theme.accent.primary} />
            <AppText variant="heading" style={{ marginLeft: 10 }}>This Week</AppText>
          </View>
          <AppText variant="body" color="secondary" style={{ marginTop: 8 }}>
            {weeklyLine || 'No shared plans yet — start small.'}
          </AppText>
          {!!data.weekly?.streakDays && (
            <View style={st.streakBadge}>
              <AppText style={st.streakText}>🔥 {data.weekly.streakDays} day streak</AppText>
            </View>
          )}
        </Card>


        {/* Relationship Journey (Trends) */}
        {!!data.history?.insights?.length && (
          <Card style={st.journeyCard}>
            <View style={st.journeyHeader}>
              <Feather name="trending-up" size={20} color={theme.accent.primary} />
              <AppText variant="heading" style={{ marginLeft: 10 }}>Your Journey</AppText>
            </View>

            {data.history.insights.slice(0, 3).map((ins: { title?: string; body?: string; icon?: string; color?: string }, idx: number) => (
              <View key={`${ins.metric}-${ins.period}-${idx}`} style={[st.journeyRow, idx > 0 ? st.journeyRowDivider : null]}>
                <View style={st.journeyIcon}>
                  <Feather
                    name={ins.trend === 'improving' ? 'arrow-up-right' : ins.trend === 'declining' ? 'arrow-down-right' : 'minus'}
                    size={18}
                    color={ins.trend === 'improving' ? theme.semantic.riskLow : ins.trend === 'declining' ? theme.semantic.riskMed : theme.text.tertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  {!!ins.milestone && (
                    <AppText variant="body" style={{ fontWeight: '700' }}>{ins.milestone}</AppText>
                  )}
                  <AppText variant="body" color="secondary" style={{ marginTop: ins.milestone ? 4 : 0 }}>
                    {ins.story}
                  </AppText>
                  <AppText variant="caption" color="tertiary" style={{ marginTop: 6 }}>
                    {String(ins.period).toUpperCase()} • {String(ins.metric).toUpperCase()}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Quick Actions */}
        <View style={st.section}>
          <AppText variant="caption" color="tertiary" style={st.sectionTitle}>
            QUICK ACTIONS
          </AppText>
          <ActionButton
            icon="moon"
            label="Tonight Suggestion"
            onPress={() => navigation.navigate('TonightSuggestion')}
            variant="primary"
            theme={theme}
          />
          <ActionButton
            icon="calendar"
            label="Find Free Slot"
            onPress={() => navigation.navigate('AutoSchedule')}
            theme={theme}
          />
          <ActionButton
            icon="coffee"
            label="Generate Date Ideas"
            onPress={() => navigation.navigate('DateGenerator')}
            theme={theme}
          />
        </View>

        {/* Insights / Nudges */}
        {data.tension?.length > 0 && (
          <View style={st.section}>
            <AppText variant="caption" color="tertiary" style={st.sectionTitle}>
              INSIGHTS
            </AppText>
            {data.tension.map((t: { label: string; score: number; icon?: string }) => (
              <InsightCard
                key={t.id}
                icon="heart"
                title={t.title}
                body={t.body}
                theme={theme}
              />
            ))}
          </View>
        )}

        {/* More Features */}
        <View style={st.section}>
          <AppText variant="caption" color="tertiary" style={st.sectionTitle}>
            MORE
          </AppText>
          <InsightCard
            icon="image"
            title="Memory Timeline"
            body="Milestones and moments — private to you two"
            action
            onPress={() => navigation.navigate('MemoryTimeline')}
            theme={theme}
          />
          <InsightCard
            icon="bar-chart-2"
            title="Weekly Report"
            body="Detailed insights and patterns"
            action
            onPress={() => navigation.navigate('WeeklyReport')}
            theme={theme}
          />
          <InsightCard
            icon="aperture"
            title="Shared Wallpaper"
            body="A dynamic vibe for you both"
            action
            onPress={() => navigation.navigate('Wallpaper')}
            theme={theme}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  container: {
    padding: tokens.space.base,
    paddingBottom: tokens.space.xxl,
  },
  
  // Loading & Empty States
  loadingCard: {
    padding: tokens.space.xxl,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: tokens.space.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Hero Score Card
  heroCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: tokens.space.lg,
  },
  heroGradient: {
    padding: tokens.space.lg,
    borderRadius: tokens.radius.lg,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 40,
    marginRight: tokens.space.md,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: tokens.type.size.lg,
    fontWeight: tokens.type.weight.bold,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: tokens.type.size.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  heroScore: {
    alignItems: 'center',
    minWidth: 70,
  },
  heroScoreNumber: {
    fontSize: 36,
    fontWeight: tokens.type.weight.heavy,
    color: '#FFFFFF',
    lineHeight: 38,
  },
  heroScoreLabel: {
    fontSize: tokens.type.size.xs,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: tokens.space.lg,
  },
  metricCard: {
    width: (Dimensions.get('window').width - tokens.space.lg * 2 - 40) / 2,
    padding: tokens.space.md,
    paddingHorizontal: 6,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.sm,
  },
  metricLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: tokens.type.size.xs,
  },
  metricBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: 6,
    borderRadius: 3,
  },
  
  // Week Card
  weekCard: {
    marginBottom: tokens.space.lg,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadge: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.streak + '1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  streakText: {
    fontSize: tokens.type.size.sm,
    fontWeight: tokens.type.weight.semi,
    color: tokens.streak,
  },
  
  // Sections
  section: {
    marginBottom: tokens.space.lg,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: tokens.type.size.xs,
    fontWeight: tokens.type.weight.bold,
    marginBottom: tokens.space.sm,
  },
  
  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.sm,
    ...tokens.shadow.sm,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Insight Cards
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.sm,
    ...tokens.shadow.sm,
  },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  insightContent: {
    flex: 1,
  },
  
  // Utilities
  mt10: { marginTop: 10 },
  mt14: { marginTop: 14 },
  mt20: { marginTop: 20 },
});
