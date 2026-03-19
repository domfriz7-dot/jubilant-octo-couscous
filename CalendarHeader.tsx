import React from 'react';
import { Animated, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AppText from '../../ui/components/AppText';
import { tokens } from '../../config/tokens';
import { todayKey as localDateKey } from '../../utils/dateTime';

interface Props {
  event: Record<string, unknown> | null;
  sheetAnim: Animated.Value;
  theme: Record<string, unknown>;
  todayKey: string;
  onReschedule: (dateKey: string) => void;
  onDismiss: () => void;
}

function RescheduleSheet({ event, sheetAnim, theme, todayKey, onReschedule, onDismiss }: Props) {
  if (!event) return null;

  const addDays = (dateStr: string, n: number) => { const d = new Date(`${dateStr}T00:00:00`); d.setDate(d.getDate() + n); return localDateKey(d); };
  const options = [
    { label: 'Move to Today', date: todayKey, icon: 'sun' },
    { label: 'Move to Tomorrow', date: addDays(todayKey, 1), icon: 'sunrise' },
    { label: 'Move to Next Week', date: addDays(todayKey, 7), icon: 'calendar' },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onDismiss}
        accessibilityLabel="Close reschedule" accessibilityRole="button">
        <Animated.View style={{ opacity: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }), ...StyleSheet.absoluteFillObject, backgroundColor: '#000' }} />
      </TouchableOpacity>
      <Animated.View style={[s.sheet, { backgroundColor: theme.bg.card, transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }] }]}>
        <View style={s.handle} />
        <AppText variant="label" style={{ marginBottom: 4 }}>Reschedule</AppText>
        <AppText variant="caption" color="secondary" style={{ marginBottom: 16 }}>{event.title}</AppText>
        {options.map((opt, idx: number) => (
          <TouchableOpacity
              accessibilityRole="button" key={`${opt.label}-${idx}`} onPress={() => onReschedule(opt.date)}
            style={[s.opt, { backgroundColor: theme.bg.subtle }]} activeOpacity={0.8}
            accessibilityLabel={opt.label}>
            <Feather name={opt.icon} size={18} color={theme.accent.primary} />
            <AppText variant="body" style={{ marginLeft: 12, flex: 1 }}>{opt.label}</AppText>
            <AppText variant="caption" color="secondary">{new Date(`${opt.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</AppText>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onDismiss} style={[s.opt, { marginTop: 4 }]} activeOpacity={0.8}
          accessibilityLabel="Cancel" accessibilityRole="button">
          <Feather name="x" size={18} color={theme.text.tertiary} />
          <AppText variant="body" color="secondary" style={{ marginLeft: 12 }}>Cancel</AppText>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default React.memo(RescheduleSheet);

const s = StyleSheet.create({
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, ...tokens.shadow.lg },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(150,150,150,0.35)', alignSelf: 'center', marginBottom: 16 },
  opt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 6, minHeight: 48 },
});