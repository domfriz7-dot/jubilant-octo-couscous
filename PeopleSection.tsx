import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import AppText from '../../ui/components/AppText';
import PressableScale from '../../ui/components/PressableScale';
import { haptics } from '../../ui/haptics';
import { tokens } from '../../config/tokens';

interface Props {
  snapshot: Record<string, unknown> | null;
  navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void };
}

function IntelCard({ icon, iconColor, iconBg, label, title, subtitle, onPress, borderColor, theme }: { icon: string; iconColor: string; iconBg: string; label: string; title: string; subtitle: string; onPress: () => void; borderColor: string; theme: Record<string, unknown> }) {
  // Feather icon names are ASCII-only (e.g. "zap", "alert-triangle").
  // Emoji strings contain non-ASCII chars. Use this to pick the right renderer.
  const isFeatherIcon = typeof icon === 'string' && /^[a-z0-9-]+$/.test(icon);
  return (
    <PressableScale
      onPress={() => { haptics.light(); onPress(); }}
      style={[s.card, { backgroundColor: theme.bg.card, borderColor: borderColor + '25', ...theme.shadow.sm }]}
      accessibilityRole="button"
    >
      <View style={[s.iconCircle, { backgroundColor: iconBg || iconColor + '12' }]}>
        {isFeatherIcon ? (
          <Feather name={icon} size={18} color={iconColor} />
        ) : (
          <AppText style={{ fontSize: 22 }}>{icon}</AppText>
        )}
      </View>
      <View style={s.cardBody}>
        <AppText variant="tiny" style={[s.cardLabel, { color: theme.text.tertiary }]}>{label}</AppText>
        <AppText variant="label" style={s.cardTitle}>{title}</AppText>
        {!!subtitle && <AppText variant="caption" color="secondary" style={s.cardSub} numberOfLines={1}>{subtitle}</AppText>}
      </View>
      <View style={[s.chevron, { backgroundColor: theme.bg.subtle }]}>
        <Feather name="chevron-right" size={14} color={theme.text.tertiary} />
      </View>
    </PressableScale>
  );
}

export default function IntelligenceCards({ snapshot, navigation }: Props) {
  const { theme } = useAppTheme();

  return (
    <>
      {/* Daily Ritual */}
      {snapshot?.partner ? <PressableScale
        onPress={() => { haptics.light(); navigation.navigate('DailyRitual'); }}
        style={[s.ritualCard, {
          backgroundColor: theme.bg.card,
          borderColor: (snapshot?.ritual?.todayDone ? theme.accent.primary : theme.error) + '25',
          ...theme.shadow.sm,
        }]}
        accessibilityRole="button"
        accessibilityLabel="Daily Ritual check-in"
      >
        <View style={s.ritualTop}>
          <View style={[s.ritualIcon, { backgroundColor: (snapshot?.ritual?.todayDone ? theme.accent.primary : theme.error) + '10' }]}>
            <Feather name="heart" size={18} color={snapshot?.ritual?.todayDone ? theme.accent.primary : theme.error} />
          </View>
          <View style={s.ritualBody}>
            <AppText variant="label" style={s.ritualTitle}>Daily Ritual</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              {snapshot?.ritual?.todayDone ? 'Done for today — keep the streak alive' : '60 seconds. Build your relationship score.'}
            </AppText>
          </View>
        </View>
        <View style={[s.ritualMeta, { borderTopColor: theme.divider }]}>
          <View style={s.ritualStat}>
            <Feather name="zap" size={12} color={tokens.streak} />
            <AppText variant="bodySm" style={{ marginLeft: 4, fontWeight: '700' }}>{snapshot?.ritual?.streak || 0}d</AppText>
            <AppText variant="caption" color="tertiary" style={{ marginLeft: 4 }}>streak</AppText>
          </View>
          <View style={[s.ritualBadge, { backgroundColor: snapshot?.ritual?.todayDone ? theme.accent.primary + '15' : theme.error + '12' }]}>
            <AppText style={{ fontSize: 10, fontWeight: '700', color: snapshot?.ritual?.todayDone ? theme.accent.primary : theme.error }}>
              {snapshot?.ritual?.todayDone ? '✓ DONE' : 'DO NOW'}
            </AppText>
          </View>
        </View>
      </PressableScale> : null}

      {/* Health Score */}
      {snapshot?.health && (() => {
        const hs = snapshot.health;
        const score = hs.score || 0;
        const isWarmup = hs.isWarmup || score === 0;
        return (
          <IntelCard
            icon={isWarmup ? '📊' : score >= 80 ? '💚' : score >= 60 ? '💙' : score >= 40 ? '💛' : '🧡'}
            iconColor={isWarmup ? theme.text.tertiary : hs.color}
            iconBg={(isWarmup ? theme.text.tertiary : hs.color) + '12'}
            label="HEALTH SCORE"
            title={isWarmup ? 'Getting Started' : `${score}/100 · ${hs.level}`}
            subtitle={isWarmup
              ? (hs.message || 'Add shared plans to start building your score')
              : (hs.message || '').split('.')[0]}
            borderColor={isWarmup ? theme.text.tertiary : hs.color}
            onPress={() => navigation.navigate('HealthScore')}
            theme={theme}
          />
        );
      })()}

      {/* Conflict / Tension Alert */}
      {snapshot?.conflict && snapshot.conflict.riskLevel !== 'low' && !snapshot.conflict.isNewUser && !snapshot.conflict.isWarmup && (
        <IntelCard
          icon="alert-triangle"
          iconColor={snapshot.conflict.color || '#F59E0B'}
          label="TENSION ALERT"
          title={snapshot.conflict.riskLevel === 'high' ? 'High Risk' : 'Watch Carefully'}
          subtitle={`${(snapshot.conflict.reasons || []).length} warning signal${(snapshot.conflict.reasons || []).length !== 1 ? 's' : ''} detected`}
          borderColor={snapshot.conflict.color || '#F59E0B'}
          onPress={() => navigation.navigate('ConflictPredictor')}
          theme={theme}
        />
      )}

      {/* Emergency Date Generator */}
      <IntelCard
        icon="zap"
        iconColor={theme.accent.primary}
        label="NEED A DATE IDEA?"
        title="Emergency Date Generator"
        subtitle="Get instant ideas for right now"
        borderColor={theme.accent.primary}
        onPress={() => navigation.navigate('EmergencyDate', { urgency: 'tonight' })}
        theme={theme}
      />
    </>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: tokens.space.base, borderRadius: tokens.radius.lg,
    borderWidth: 1, marginBottom: tokens.space.sm,
  },
  iconCircle: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0, marginLeft: tokens.space.md },
  cardLabel: { letterSpacing: 0.5 },
  cardTitle: { marginTop: 2 },
  cardSub: { marginTop: 2 },
  chevron: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  // Daily Ritual — special layout
  ritualCard: {
    flexDirection: 'column', padding: tokens.space.base,
    borderRadius: tokens.radius.lg, borderWidth: 1, marginBottom: tokens.space.sm,
  },
  ritualTop: { flexDirection: 'row', alignItems: 'center' },
  ritualIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ritualBody: { flex: 1, minWidth: 0, marginLeft: 12 },
  ritualTitle: { fontWeight: '700' },
  ritualMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  ritualStat: { flexDirection: 'row', alignItems: 'center' },
  ritualBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});
