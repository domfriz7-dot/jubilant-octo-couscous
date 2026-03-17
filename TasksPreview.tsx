import React, { useCallback, memo } from 'react';
import { Alert, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import AppText from '../../ui/components/AppText';
import Avatar from '../../ui/components/Avatar';
import SectionHeader from '../../ui/components/SectionHeader';
import { haptics } from '../../ui/haptics';
import { tokens } from '../../config/tokens';
import { resolveColor } from '../../viewModels/resolveColor';
import NotificationService from '../../services/NotificationService';

export default function PeopleSection({ vm, navigation }: { vm: Record<string, unknown>; navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme } = useAppTheme();
  if (!vm.people) return null;
  return (
    <View style={s.section} accessibilityRole="list" accessibilityLabel="Your connections">
      <SectionHeader label={vm.people.label} />
      {vm.people.rows.map((row: Record<string, unknown>, idx: number) => {
        const tagColor = resolveColor(row.tagColorKey, theme);
        return (
          <TouchableOpacity key={`${row.id}-${idx}`} activeOpacity={0.7}
            onPress={() => navigation.navigate('ConnectionDetail', { user: row.user })}
            style={s.line} accessibilityRole="button" accessibilityLabel={`${row.name}${row.tag ? `, ${row.tag}` : ''}`}>
            <Avatar name={row.avatar.name} color={row.avatar.color} size={36} />
            <View style={s.body}>
              <AppText variant="body" numberOfLines={1} style={{ fontWeight: '500' }}>{row.name}</AppText>
              {row.tag && <AppText variant="caption" style={{ color: tagColor, fontWeight: row.tagBold ? '600' : '400', marginTop: 1 }} numberOfLines={1}>{row.tag}</AppText>}
            </View>
            <View style={[s.bar, { backgroundColor: theme.bg.subtle }]}><View style={{ width: `${row.barWidth}%`, height: 4, backgroundColor: theme.accent.muted, borderRadius: 2 }} /></View>
            <Feather name="chevron-right" size={14} color={theme.text.tertiary} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );
      })}
      {vm.people.nudge && (
        <View style={[s.nudge, { borderLeftColor: resolveColor(vm.people.nudge.colorKey, theme) }]}>
          <View style={s.nudgeRow}>
            <AppText style={[s.nudgeText, { color: resolveColor(vm.people.nudge.colorKey, theme) }]}>{vm.people.nudge.text}</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={async () => {
              haptics.medium();
              try { await NotificationService.sendNudge({ title: `Nudge ${vm?.people?.primaryName || 'Partner'}`, body: vm.people.nudge.text, data: { toName: vm?.people?.primaryName || 'Partner' } }); Alert.alert('Nudge sent', 'A reminder has been sent.'); } catch { Alert.alert('Could not send', 'Check notification permissions.'); }
            }} style={[s.nudgeBtn, { backgroundColor: resolveColor(vm.people.nudge.colorKey, theme) + '15' }]} activeOpacity={0.7}>
              <Feather name="send" size={12} color={resolveColor(vm.people.nudge.colorKey, theme)} />
              <AppText style={[s.nudgeBtnT, { color: resolveColor(vm.people.nudge.colorKey, theme) }]}>Nudge</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  section: { marginBottom: tokens.space.xl },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  body: { flex: 1, marginLeft: 14, minWidth: 0 },
  bar: { width: 56, height: 4, borderRadius: 2, overflow: 'hidden' },
  nudge: { borderLeftWidth: 2.5, paddingLeft: 14, paddingVertical: tokens.space.sm, marginTop: tokens.space.md },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nudgeText: { fontSize: 13, flex: 1, lineHeight: 18 },
  nudgeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: tokens.radius.pill, marginLeft: tokens.space.md },
  nudgeBtnT: { fontSize: 11, fontWeight: '600', marginLeft: tokens.space.xs },
});
