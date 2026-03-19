import React, { useCallback, memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import AppText from '../../ui/components/AppText';
import Avatar from '../../ui/components/Avatar';
import SectionHeader from '../../ui/components/SectionHeader';
import { tokens } from '../../config/tokens';
import { resolveColor } from '../../viewModels/resolveColor';

type HomeNav = any;
export type TaskPreviewRow = { id: string; text: string; completed?: boolean; dotColorKey: string; overdueLabel?: string | null; assignedAvatar?: { name: string; color: string } | null };
export type TasksPreviewVM = { tasks?: { label: string; linkText: string; rows: TaskPreviewRow[] } | null };

export default function TasksPreview({ vm, navigation }: { vm: TasksPreviewVM; navigation: HomeNav }) {
  const { theme } = useAppTheme();
  if (!vm.tasks) return null;
  return (
    <View style={s.section} accessibilityRole="list" accessibilityLabel="Tasks preview">
      <SectionHeader label={vm.tasks.label} linkText={vm.tasks.linkText} onLinkPress={() => navigation.navigate('Tasks')} />
      {vm.tasks.rows.map((row, idx) => (
        <TouchableOpacity key={`${row.id}-${idx}`} activeOpacity={0.6} onPress={() => navigation.navigate('Tasks')}
          style={s.line} accessibilityRole="button"
          accessibilityLabel={`Task: ${row.text}${row.completed ? ', completed' : ''}${row.overdueLabel ? `, ${row.overdueLabel}` : ''}`}>
          <View style={[s.check, { borderColor: resolveColor(row.dotColorKey, theme) }, row.completed && { backgroundColor: resolveColor(row.dotColorKey, theme) }]}>
            {row.completed && <Feather name="check" size={11} color="#FFF" />}
          </View>
          <AppText variant="body" style={[s.text, row.completed && s.done, row.completed && { color: theme.text.tertiary }]} numberOfLines={1}>{row.text}</AppText>
          {row.overdueLabel ? <AppText style={[s.overdue, { color: theme.error }]}>{row.overdueLabel}</AppText> : null}
          {row.assignedAvatar ? <Avatar name={row.assignedAvatar.name} color={row.assignedAvatar.color} size={22} style={{ marginLeft: 10 }} /> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  section: { marginBottom: tokens.space.xl },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  text: { flex: 1, fontSize: 15 }, done: { textDecorationLine: 'line-through', opacity: 0.5 },
  overdue: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
});
