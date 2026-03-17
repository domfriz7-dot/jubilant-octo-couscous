import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, View, TouchableOpacity  } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Button from '../ui/components/Button';
import ScoreRing from '../ui/components/ScoreRing';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { computeHealthScore } from '../services/HealthScoreService';
import { tokens } from '../config/tokens';
import { logError } from '../services/logger';
import { isProUser } from '../services/SubscriptionService';
import { logEvent } from '../services/Telemetry';
import { openPaywall } from '../services/openPaywall';

// ─── Components ───────────────────────────────────────────

function HealthMeter({ score, level, color, theme }) {
  return (
    <View style={st.meterContainer}>
      <ScoreRing
        value={score}
        size={164}
        stroke={12}
        label={level}
        color={color}
        trackColor={theme.bg.muted}
        trackOpacity={1}
      />
    </View>
  );
}

const FactorBar = React.memo(function FactorBar({ label, value, icon, theme }) {
  const percentage = Math.round(value);
  const color = 
    percentage >= 80 ? theme.semantic.scoreExcellent :
    percentage >= 60 ? theme.semantic.scoreGood :
    percentage >= 40 ? theme.semantic.scoreFair : theme.semantic.scorePoor;

  return (
    <View style={st.factorRow}>
      <View style={st.factorHeader}>
        <View style={st.rowCenter}>
          <Feather name={icon} size={16} color={theme.text.secondary} />
          <AppText style={[st.factorLabel, { color: theme.text.primary, marginLeft: 8 }]}>{label}</AppText>
        </View>
        <AppText style={[st.factorValue, { color }]}>{percentage}%</AppText>
      </View>
      <View style={[st.barTrack, { backgroundColor: theme.bg.muted }]}>
        <View 
          style={[
            st.barFill, 
            { 
              width: `${percentage}%`, 
              backgroundColor: color,
            }
          ]} 
        />
      </View>
    </View>
  );
});

const RecommendationCard = React.memo(function RecommendationCard({ icon, title, body, priority, theme, onPress }) {
  const priorityColor = 
    priority === 'high' ? theme.semantic.riskHigh :
    priority === 'medium' ? theme.semantic.riskMed : theme.semantic.riskLow;

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      style={[st.recCard, { backgroundColor: theme.bg.card, borderLeftColor: priorityColor }]}
    
                accessibilityRole="button">
      <View style={[st.recIcon, { backgroundColor: priorityColor + '15' }]}>
        <Feather name={icon} size={18} color={priorityColor} />
      </View>
      <View style={st.flex1ml12}>
        <AppText style={[st.recTitle, { color: theme.text.primary }]}>{title}</AppText>
        <AppText style={[st.recBody, { color: theme.text.secondary }]}>{body}</AppText>
      </View>
      <Feather name="chevron-right" size={18} color={theme.text.tertiary} />
    </TouchableOpacity>
  );
});

function TrendBadge({ trend, theme }) {
  if (!trend || trend.direction === 'flat') {
    return (
      <View style={[st.trendBadge, { backgroundColor: theme.bg.muted }]}>
        <Feather name="minus" size={14} color={theme.text.secondary} />
        <AppText style={[st.trendText, { color: theme.text.secondary }]}>Stable</AppText>
      </View>
    );
  }

  const isUp = trend.direction === 'up';
  const color = isUp ? theme.success : theme.error;
  const icon = isUp ? 'trending-up' : 'trending-down';

  return (
    <View style={[st.trendBadge, { backgroundColor: color + '15' }]}>
      <Feather name={icon} size={14} color={color} />
      <AppText style={[st.trendText, { color }]}>
        {isUp ? '+' : ''}{trend.delta} pts (30d)
      </AppText>
    </View>
  );
}


function ChecklistRow({ checked, text, theme }: { checked: boolean; text: string; theme: Record<string, unknown> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Feather
        name={checked ? 'check-circle' : 'circle'}
        size={18}
        color={checked ? theme.success : theme.text.tertiary}
      />
      <AppText variant="body" color={checked ? 'primary' : 'secondary'}>
        {text}
      </AppText>
    </View>
  );
}


// ─── Main Screen ──────────────────────────────────────────

export default function HealthScoreScreen({ navigation }: { navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Track whether we've already sent user to paywall this mount cycle.
  // Without this guard, returning from Paywall triggers loadScore again,
  // which re-gates, which navigates to Paywall, creating an infinite loop.
  const hasGatedRef = useRef(false);

  const gateIfNotPro = useCallback(async (): Promise<boolean> => {
    if (hasGatedRef.current) return true; // already gated this session
    try {
      const pro = await isProUser();
      if (!pro) {
        hasGatedRef.current = true;
        logEvent('pro_gate_hit', { feature: 'health_score' });
        // Open Paywall as a modal on the root navigator (safe).
        openPaywall(navigation, { source: 'HealthScore', returnTo: 'HealthScore' });
        // Replace this gated screen with a safe landing screen so closing Paywall
        // doesn't reveal it again (loop prevention).
        navigation.replace('MainTabs', { screen: 'Home' });
        return true;
      }
      return false;
    } catch {
      hasGatedRef.current = true;
      logEvent('pro_gate_hit', { feature: 'health_score', reason: 'entitlement_error' });
      openPaywall(navigation, { source: 'HealthScore', returnTo: 'HealthScore' });
      navigation.replace('MainTabs', { screen: 'Home' });
      return true;
    }
  }, [navigation]);

  const safeNavigate = (routeName: string, params?: Record<string, unknown>) => {
    if (!routeName) return;
    try {
      navigation.navigate(routeName, params);
    } catch (e) {
      // If the route doesn't exist, avoid crashing.
      // Intentionally ignored — non-critical failure
    }
  };

  const handleRecommendationPress = (rec: { action?: string; title?: string }) => {
    if (!rec) return;
    haptics.light();
    const title = (rec?.title || '').toLowerCase();

    // Heuristic routing: keep this robust even if copy changes slightly.
    if (title.includes('plan') || title.includes('schedule') || title.includes('time together')) {
      safeNavigate('CalendarTab');
      return;
    }

    if (title.includes('reliab') || title.includes('task')) {
      safeNavigate('TasksTab');
      return;
    }

    if (title.includes('respond')) {
      // No dedicated "responses" screen yet; bring them to Connections where check-ins live.
      safeNavigate('Connections');
      return;
    }

    // Default: take them back to the engine hub.
    safeNavigate('RelationshipEngine');
  };

  const loadScore = useCallback(async () => {
    try {
      const gated = await gateIfNotPro();
      if (gated) return;
      setLoading(true);
      const score = await computeHealthScore();
      setData(score);
    } catch (err) {
      logError('Failed to load health score:', err);
    } finally {
      setLoading(false);
    }
  }, [gateIfNotPro]);

  // Initial load / gate.
  useEffect(() => {
    loadScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadScore();
    setRefreshing(false);
  }, [loadScore]);

  // useFocusEffect: re-runs when screen comes into focus.
  // DO NOT auto-gate on focus. If the user closes Paywall without purchasing,
  // re-gating here creates a tight loop (HealthScore -> Paywall -> back -> HealthScore ...).
  // We only refresh the score if the user *is already Pro*.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const pro = await isProUser();
          if (!alive) return;
          if (pro) {
            hasGatedRef.current = false;
            loadScore();
          }
        } catch {
          // ignore
          // Intentionally ignored — non-critical failure
        }
      })();
      return () => {
        alive = false;
      };
    }, [loadScore])
  );

  if (loading || !data) {
    return (
      <Screen>
        <Header 
          title="Health Score" 
          leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText style={{ color: theme.text.secondary }}>Loading your score...</AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header 
        title="Relationship Health" 
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        rightAction={{ 
          icon: 'refresh-cw', 
          onPress: () => { haptics.light(); loadScore(); }
        }}
      />
      
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ padding: tokens.space.lg, paddingBottom: Math.max(insets.bottom, 24) + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {data.score === 0 ? (
          <Card style={{ alignItems: 'center', padding: 32 }}>
            <Feather name="trending-up" size={56} color={theme.text.tertiary} />
            <AppText variant="h2" style={{ marginTop: 16, textAlign: 'center' }}>Build Your Score</AppText>
            <AppText variant="body" color="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
              Your health score will appear once you have a little activity.
            </AppText>

            <View style={{ marginTop: 18, width: '100%', gap: 12 }}>
              <ChecklistRow checked={!!data.hasPartner} text="Connected with a partner" theme={theme} />
              <ChecklistRow checked={!!data.hasEvents} text="Created shared events" theme={theme} />
              <ChecklistRow checked={!!data.hasWeekOfData} text="One week of activity" theme={theme} />
            </View>

            <Button
              title={!data.hasPartner ? 'Invite Partner' : 'Add First Event'}
              onPress={() => {
                haptics.light();
                navigation.navigate(!data.hasPartner ? 'Connections' : 'AddEvent');
              }}
              style={{ marginTop: 22, alignSelf: 'stretch' }}
            />
          </Card>
        ) : (
          <>
        {/* Health Meter */}
        <Card>
          <HealthMeter 
            score={data.score} 
            level={data.level} 
            color={data.color}
            theme={theme}
          />
          
          <View style={{ alignItems: 'center', marginTop: tokens.space.lg }}>
            <TrendBadge trend={data.trend} theme={theme} />
          </View>

          <AppText style={[st.message, { color: theme.text.secondary, textAlign: 'center', marginTop: tokens.space.md }]}>
            {data.message}
          </AppText>
        </Card>

        {/* Factor Breakdown */}
        <Card style={{ marginTop: tokens.space.lg }}>
          <AppText style={[st.sectionTitle, { color: theme.text.primary }]}>
            Contributing Factors
          </AppText>
          
          <FactorBar 
            label="Balance" 
            value={data.breakdown.balance} 
            // Feather doesn't include "scale"; use a valid icon.
            icon="activity"
            theme={theme}
          />
          <FactorBar 
            label="Frequency" 
            value={data.breakdown.frequency} 
            icon="calendar"
            theme={theme}
          />
          <FactorBar 
            label="Response Speed" 
            value={data.breakdown.responseSpeed} 
            icon="clock"
            theme={theme}
          />
          <FactorBar 
            label="Reliability" 
            value={data.breakdown.reliability} 
            icon="check-circle"
            theme={theme}
          />
          <FactorBar 
            label="Emotional Alignment" 
            value={data.breakdown.emotionalAlignment} 
            icon="heart"
            theme={theme}
          />
        </Card>

        {/* Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <View style={{ marginTop: tokens.space.lg }}>
            <AppText style={[st.sectionTitle, { color: theme.text.primary, marginBottom: tokens.space.md }]}>
              Ways to Improve
            </AppText>
            
            {data.recommendations.map((rec, idx) => (
              <RecommendationCard
                key={idx}
                icon={rec.icon}
                title={rec.title}
                body={rec.body}
                priority={rec.priority}
                theme={theme}
                onPress={() => handleRecommendationPress(rec)}
              />
            ))}
          </View>
        )}

        {/* Info Note */}
        <Card style={{ marginTop: tokens.space.lg, backgroundColor: theme.accent.light }}>
          <View style={st.row}>
            <Feather name="info" size={16} color={theme.accent.primary} style={st.mt2} />
            <View style={st.flex1ml10}>
              <AppText style={{ fontSize: 13, color: theme.text.secondary }}>
                Your health score updates based on your interactions, plans, and emotional check-ins. 
                Scores between 70-85 are considered healthy.
              </AppText>
            </View>
          </View>
        </Card>
          </>
        )}

      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────

const st = StyleSheet.create({
  meterContainer: {
    alignItems: 'center',
    paddingVertical: tokens.space.xl,
  },
  meterCircle: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  scoreDisplay: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
  },
  scoreLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  scoreLevel: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: tokens.space.md,
  },
  factorRow: {
    marginTop: tokens.space.md,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  factorLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  factorValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderLeftWidth: 4,
    marginBottom: tokens.space.sm,
    ...tokens.shadow.sm,
  },
  recIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  recBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  flex1ml10: { flex: 1, marginLeft: 10 },
  flex1ml12: { flex: 1, marginLeft: 12 },
  mt2: { marginTop: 2 },
  row: { flexDirection: 'row' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
});
