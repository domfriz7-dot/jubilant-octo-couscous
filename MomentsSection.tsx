import React, { memo, useState } from 'react';
import { Dimensions, View, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import AppText from '../../ui/components/AppText';
import Card from '../../ui/components/Card';
import PressableScale from '../../ui/components/PressableScale';
import { haptics } from '../../ui/haptics';
import { tokens } from '../../config/tokens';
import PulseService, { PULSE_OPTIONS } from '../../services/PulseService';
import XPService from '../../services/XPService';

const { width: SCREEN_W } = Dimensions.get('window');
// Card has 20px padding each side, parent has lg (24) padding each side
const CARD_INNER = SCREEN_W - (tokens.space.lg * 2) - 40;
const GAP = 10;
const COLS = 3;
const ITEM_W = Math.floor((CARD_INNER - GAP * (COLS - 1)) / COLS);

// Map pulse IDs to Feather icons + brand colors for consistent cross-platform rendering
const PULSE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  close:    { icon: 'heart',    color: '#C06B65', bg: '#C06B6515' },
  grateful: { icon: 'sun',      color: '#D9A566', bg: '#D9A56615' },
  steady:   { icon: 'minus',    color: '#6B9B7F', bg: '#6B9B7F15' },
  busy:     { icon: 'zap',      color: '#7B93B3', bg: '#7B93B315' },
  distant:  { icon: 'cloud',    color: '#9B9389', bg: '#9B938915' },
  missing:  { icon: 'message-circle', color: '#B8897A', bg: '#B8897A15' },
};

interface Props { pulse: Record<string, unknown> | null; setPulse: (updater: (prev: unknown) => unknown) => void; }

export default memo(function DailyPulse({ pulse, setPulse }: Props) {
  const { theme, isDark } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');

  if (!pulse) return null;

  // Answered state
  if (pulse.answered && pulse.pulse && !expanded) {
    const ic = PULSE_ICONS[pulse.pulse.id] || PULSE_ICONS.steady;
    return (
      <PressableScale
        onPress={() => setExpanded(true)}
        style={[s.done, { backgroundColor: ic.color + '08', borderLeftColor: ic.color }]}
        accessibilityRole="button" accessibilityLabel={`Today's pulse: ${pulse.pulse.label}. Tap to change.`}
      >
        <View style={[s.doneIcon, { backgroundColor: ic.bg }]}>
          <AppText style={{ fontSize: 18 }}>{pulse.pulse.emoji || '💛'}</AppText>
        </View>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <AppText variant="label">Today's pulse: {pulse.pulse.label}</AppText>
          <AppText variant="caption" color="tertiary" style={{ marginTop: 3 }}>Tap to change or add a note</AppText>
        </View>
      </PressableScale>
    );
  }

  // Unanswered / expanded state
  return (
    <Card style={s.card}>
      <AppText variant="tiny" style={{ color: theme.text.tertiary }}>DAILY PULSE</AppText>
      <AppText variant="body" style={{ marginTop: 10, marginBottom: 18 }}>
        {expanded ? 'Change your pulse:' : pulse.prompt}
      </AppText>
      <View style={s.grid}>
        {PULSE_OPTIONS.map((opt: { id: string; label: string; emoji?: string }) => {
          const ic = PULSE_ICONS[opt.id] || PULSE_ICONS.steady;
          const selected = pulse.pulse?.id === opt.id;
          return (
            <PressableScale key={opt.id} onPress={async () => {
              haptics.success();
              await PulseService.recordPulse(pulse.connectionId, opt.id, note.trim() || undefined);
              setPulse((prev: unknown) => ({ ...prev, answered: true, pulse: opt }));
              setExpanded(false);
              setNote('');
              try { await XPService.awardXP(3, 'Daily pulse'); } catch {
                // Intentionally ignored — non-critical failure
              }
            }}
              style={[s.option, {
                backgroundColor: selected ? ic.color + '18' : isDark ? theme.bg.elevated : theme.bg.subtle,
                borderColor: selected ? ic.color + '40' : 'transparent',
                borderWidth: selected ? 1.5 : 0,
              }]}
              accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={opt.label}>
              <View style={[s.optionIcon, { backgroundColor: ic.bg }]}>
                <AppText style={{ fontSize: 20 }}>{opt.emoji || '✨'}</AppText>
              </View>
              <AppText style={[s.optionLabel, { color: selected ? ic.color : theme.text.primary }]} numberOfLines={2}>{opt.label}</AppText>
            </PressableScale>
          );
        })}
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add a quick note (optional)..."
        placeholderTextColor={theme.text.tertiary}
        style={[s.noteInput, { color: theme.text.primary, backgroundColor: isDark ? theme.bg.elevated : theme.bg.subtle, borderColor: theme.border }]}
        maxLength={140}
        returnKeyType="done"
        blurOnSubmit
      />
      {expanded && (
        <TouchableOpacity onPress={() => setExpanded(false)} style={s.cancelBtn} accessibilityRole="button">
          <AppText variant="caption" color="secondary">Cancel</AppText>
        </TouchableOpacity>
      )}
    </Card>
  );
});

const s = StyleSheet.create({
  card: { marginBottom: tokens.space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  option: {
    width: ITEM_W, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4,
    borderRadius: tokens.radius.lg,
  },
  optionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center', lineHeight: 15 },
  done: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    borderRadius: tokens.radius.xl, borderLeftWidth: 3, marginBottom: tokens.space.lg,
  },
  doneIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  noteInput: {
    marginTop: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: tokens.radius.md, borderWidth: 1, fontSize: 14,
  },
  cancelBtn: { alignSelf: 'center', marginTop: 10, paddingVertical: 8, paddingHorizontal: 20 },
});
