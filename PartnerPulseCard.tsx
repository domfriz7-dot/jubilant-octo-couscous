import React, { useCallback, memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import AppText from '../../ui/components/AppText';
import Avatar from '../../ui/components/Avatar';
import SectionHeader from '../../ui/components/SectionHeader';
import { tokens } from '../../config/tokens';

export default function MomentsSection({ vm, navigation }: { vm: Record<string, unknown>; navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme } = useAppTheme();
  if (!vm.moments) return null;
  return (
    <View style={s.section} accessibilityRole="list" accessibilityLabel="Upcoming moments">
      <SectionHeader label={vm.moments.label} linkText={vm.moments.linkText} onLinkPress={() => navigation.navigate('CalendarTab')} />
      {vm.moments.rows.map((row: Record<string, unknown>, idx: number) => (
        <TouchableOpacity key={`${row.id}-${idx}`} activeOpacity={0.6} onPress={() => navigation.navigate('EventDetails', { event: row.event })}
          style={[s.line, { borderLeftColor: row.color || theme.accent.primary }]} accessibilityRole="button" accessibilityLabel={`${row.title}, ${row.when}`}>
          <View style={s.body}>
            <AppText variant="label" numberOfLines={1}>{row.title}</AppText>
            <AppText variant="caption" color="tertiary" style={{ marginTop: 3 }}>{row.when}</AppText>
          </View>
          {row.sharedAvatars.length > 0 && (
            <View style={s.avatars}>{row.sharedAvatars.map((u: { id: string; name: string; color?: string }, i: number) => (
              <View key={u.id} style={{ marginLeft: i > 0 ? -6 : 0 }}><Avatar name={u.name} color={u.color} size={22} /></View>
            ))}</View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  section: { marginBottom: tokens.space.xl },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingLeft: 14, borderLeftWidth: 2.5, marginBottom: 2 },
  body: { flex: 1, minWidth: 0 },
  avatars: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
});
