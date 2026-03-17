import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, View  } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Button from '../ui/components/Button';
import SmartList from '../ui/components/SmartList';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { predictConflictRisk } from '../services/ConflictPredictorService';
import { tokens } from '../config/tokens';
import { safeServiceCall } from '../utils/safeServiceCall';
import { isProUser } from '../services/SubscriptionService';
import { logEvent } from '../services/Telemetry';
import { openPaywall } from '../services/openPaywall';

type RiskLevel = 'low' | 'medium' | 'high';
type NavigationLike = { navigate: (screen: string, params?: Record<string, unknown>) => void; goBack?: () => void };

type RiskReason = string | { icon?: string; text: string; severity?: RiskLevel };

type PredictResult = {
  riskLevel: RiskLevel;
  riskPoints: number;
  riskScore?: number;
  color: string;
  message: string;
  reasons: RiskReason[];
  signals?: Record<string, unknown>;
  repairMoves?: Array<{ title?: string; text?: string; description?: string; icon?: string }>;
};

// ─── Components ───────────────────────────────────────────

function RiskMeter({ riskLevel, riskPoints, color, theme }: { riskLevel: RiskLevel; riskPoints: number; color: string; theme: Record<string, unknown> }) {
  const maxPoints = 100;
  const percentage = Math.min(riskPoints, maxPoints);

  const levelText = {
    low: 'All Clear',
    medium: 'Watch Carefully',
    high: 'Take Action Now',
  };

  return (
    <View style={st.riskMeter}>
      <View style={st.riskHeader}>
        <AppText style={[st.riskLabel, { color: theme.text.secondary }]}>Tension Risk Level</AppText>
        <AppText style={[st.riskLevel, { color }]}>{levelText[riskLevel]}</AppText>
      </View>
      
      <View style={[st.riskBar, { backgroundColor: theme.bg.muted }]}>
        <View 
          style={[
            st.riskFill, 
            { 
              width: `${percentage}%`, 
              backgroundColor: color,
            }
          ]} 
        />
      </View>

      <View style={st.riskFooter}>
        <AppText style={[st.riskPoints, { color: theme.text.tertiary }]}>
          {riskPoints}/{maxPoints} risk points
        </AppText>
      </View>
    </View>
  );
}

function SignalPill({ icon, text, severity, theme }) {
  const severityColors = {
    high: theme.semantic.riskHigh,
    medium: theme.semantic.riskMed,
    low: theme.semantic.riskLow,
  };

  const color = severityColors[severity];

  return (
    <View style={[st.signalPill, { backgroundColor: color + '10', borderColor: color + '30' }]}>
      <Feather name={icon} size={14} color={color} />
      <AppText style={[st.signalText, { color, marginLeft: 8 }]}>{text}</AppText>
    </View>
  );
}

function RepairMoveCard({ move, index, theme, onPress }) {
  const priorityEmoji = {
    high: '🔥',
    medium: '⚠️',
    low: '💡',
  };

  return (
    <Card style={{ marginTop: index === 0 ? 0 : tokens.space.md }}>
      <View style={st.repairHeader}>
        <AppText style={{ fontSize: 24 }}>{priorityEmoji[move.priority]}</AppText>
        <AppText style={[st.repairTitle, { color: theme.text.primary, flex: 1, marginLeft: 10 }]}>
          {move.title}
        </AppText>
      </View>

      <AppText style={[st.repairDescription, { color: theme.text.secondary }]}>
        {move.description}
      </AppText>

      {move.script && (
        <View style={[st.scriptBox, { backgroundColor: theme.bg.muted, borderColor: theme.accent.primary }]}>
          <AppText style={[st.scriptLabel, { color: theme.accent.primary }]}>
            Suggested script:
          </AppText>
          <AppText style={[st.scriptText, { color: theme.text.primary }]}>
            "{move.script}"
          </AppText>
        </View>
      )}

      {move.action && (
        <Button
          title={move.action}
          onPress={() => {
            haptics.success();
            onPress?.(move);
          }}
          style={{ marginTop: tokens.space.md }}
        />
      )}
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────

export default function ConflictPredictorScreen({ navigation }: { navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Prevent accidental paywall loops on back navigation.
  const hasGatedRef = useRef(false);

  const gateIfNotPro = useCallback(async (): Promise<boolean> => {
    if (hasGatedRef.current) return true;
    try {
      const pro = await isProUser();
      if (!pro) {
        hasGatedRef.current = true;
        logEvent('pro_gate_hit', { feature: 'conflict_predictor' });
        openPaywall(navigation, { source: 'ConflictPredictor', returnTo: 'ConflictPredictor' });
        navigation.replace('MainTabs', { screen: 'Home' });
        return true;
      }
      return false;
    } catch {
      // Fail closed: if entitlement check errors, treat as not-pro.
      hasGatedRef.current = true;
      logEvent('pro_gate_hit', { feature: 'conflict_predictor', reason: 'entitlement_error' });
      openPaywall(navigation, { source: 'ConflictPredictor', returnTo: 'ConflictPredictor' });
      navigation.replace('MainTabs', { screen: 'Home' });
      return true;
    }
  }, [navigation]);

  const loadPrediction = useCallback(async () => {
    const gated = await gateIfNotPro();
    if (gated) return;

    setLoading(true);
    const prediction = await safeServiceCall(
      () => predictConflictRisk(),
      null,
      { screen: 'ConflictPredictorScreen', feature: 'predictConflictRisk' },
    );
    if (prediction) setData(prediction);
    setLoading(false);
  }, [gateIfNotPro]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrediction();
    setRefreshing(false);
  }, [loadPrediction]);

  useEffect(() => {
    loadPrediction();
  }, [loadPrediction]);

  const handleRepairAction = useCallback((move: { action?: string; title?: string; text?: string }) => {
    // Handle different action types
    if (move.action === 'Send message' || move.action === 'Send request') {
      // Could open messaging UI with pre-filled script
      // For now, just acknowledge
      alert('Message template copied! Send when ready.');
    } else if (move.action === 'Pick a date' || move.action === 'Plan something') {
      // Navigate to emergency date generator
      navigation.navigate('EmergencyDate');
    } else if (move.action === 'Emergency date') {
      navigation.navigate('EmergencyDate', { urgency: 'now' });
    }
  }, [navigation]);

  if (loading || !data) {
    return (
      <Screen>
        <Header 
          title="Conflict Predictor" 
          leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText style={{ color: theme.text.secondary }}>Analyzing patterns...</AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header 
        title="Tension Alert" 
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        rightAction={{ 
          icon: 'refresh-cw', 
          onPress: () => { haptics.light(); loadPrediction(); }
        }}
      />
      
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ padding: tokens.space.lg, paddingBottom: Math.max(insets.bottom, 24) + 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Risk Level Card */}
        <Card>
          <RiskMeter 
            riskLevel={data.riskLevel}
            riskPoints={data.riskPoints}
            color={data.color}
            theme={theme}
          />

          <AppText style={[st.message, { color: theme.text.secondary, marginTop: tokens.space.md }]}>
            {data.message}
          </AppText>
        </Card>

        {/* Signals */}
        {data.reasons && data.reasons.length > 0 && (
          <View style={{ marginTop: tokens.space.lg }}>
            <AppText style={[st.sectionTitle, { color: theme.text.primary }]}>
              Signals
            </AppText>
            
            <SmartList
              data={data.reasons}
              keyExtractor={(_, index) => String(index)}
              estimatedItemSize={44}
              scrollEnabled={false}
              renderItem={({ item: reason, index: idx }) => {
                const r = typeof reason === 'string'
                  ? { icon: 'info', text: reason, severity: 'low' as const }
                  : { icon: (reason as Record<string, unknown>).icon || 'info', text: (reason as Record<string, unknown>).text, severity: (((reason as Record<string, unknown>).severity || 'low') as RiskLevel) };
                return (
                  <SignalPill
                    icon={r.icon}
                    text={r.text}
                    severity={r.severity}
                    theme={theme}
                  />
                );
              }}
            />
          </View>
        )}

        {/* Repair Moves */}
        {data.repairMoves && data.repairMoves.length > 0 && (
          <View style={{ marginTop: tokens.space.xl }}>
            <AppText style={[st.sectionTitle, { color: theme.text.primary }]}>
              Suggested Repair Moves
            </AppText>
            <AppText style={[st.sectionSubtitle, { color: theme.text.secondary }]}>
              Small actions that can prevent bigger problems
            </AppText>
            
            <SmartList
              data={data.repairMoves}
              keyExtractor={(_, index) => String(index)}
              estimatedItemSize={120}
              scrollEnabled={false}
              renderItem={({ item: move, index }) => (
                <RepairMoveCard
                  move={move}
                  index={index}
                  theme={theme}
                  onPress={() => {
                    haptics.light();
                    logEvent('conflict_repair_move_opened', { index, title: (move as Record<string, unknown>).title || (move as Record<string, unknown>).text });
                  }}
                />
              )}
            />
          </View>
        )}

        {/* Success State */}
        {data.riskLevel === 'low' && (
          <Card style={{ marginTop: tokens.space.lg, backgroundColor: theme.success + '15' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <AppText style={{ fontSize: 32 }}>✅</AppText>
              <View style={st.flex1ml12}>
                <AppText style={[st.successTitle, { color: theme.text.primary }]}>
                  You're in good shape!
                </AppText>
                <AppText style={[st.successBody, { color: theme.text.secondary }]}>
                  No major tension signals detected. Keep maintaining your rhythm and communication patterns.
                </AppText>
              </View>
            </View>
          </Card>
        )}

        {/* Info Note */}
        <Card style={{ marginTop: tokens.space.lg, backgroundColor: theme.accent.primary + '0D' }}>
          <View style={st.row}>
            <Feather name="shield" size={16} color={theme.accent.primary} style={st.mt2} />
            <View style={st.flex1ml10}>
              <AppText style={{ fontSize: tokens.type.size.sm, color: theme.text.secondary, lineHeight: 18 }}>
                This alert is based on patterns in your shared plans (like cancellations/reschedules),
                recent pulse check-ins, and whether you have upcoming time together. It's designed
                to help you stay ahead of issues, not create anxiety.
              </AppText>
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────

const st = StyleSheet.create({
  riskMeter: {
    paddingVertical: tokens.space.md,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.sm,
  },
  riskLabel: {
    fontSize: tokens.type.size.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riskLevel: {
    fontSize: tokens.type.size.lg,
    fontWeight: '800',
  },
  riskBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  riskFill: {
    height: 12,
    borderRadius: 6,
  },
  riskFooter: {
    marginTop: tokens.space.xs,
  },
  riskPoints: {
    fontSize: 12,
    textAlign: 'right',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: tokens.space.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: tokens.space.md,
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    marginBottom: tokens.space.sm,
  },
  signalText: {
    fontSize: tokens.type.size.sm,
    fontWeight: '600',
  },
  repairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.sm,
  },
  repairTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  repairDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  scriptBox: {
    marginTop: tokens.space.md,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderLeftWidth: 3,
  },
  scriptLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  scriptText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  successTitle: {
    fontSize: tokens.type.size.lg,
    fontWeight: '700',
    marginBottom: 4,
  },
  successBody: {
    fontSize: tokens.type.size.sm,
    lineHeight: 18,
  },
  flex1ml10: { flex: 1, marginLeft: 10 },
  flex1ml12: { flex: 1, marginLeft: 12 },
  mt2: { marginTop: 2 },
  row: { flexDirection: 'row' },
});
