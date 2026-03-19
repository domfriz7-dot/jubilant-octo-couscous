import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AppText from '../../ui/components/AppText';
import Card from '../../ui/components/Card';
import Avatar from '../../ui/components/Avatar';
import EventCard from './EventCard';
import { useCalendarViewModel } from '../../viewModels/useCalendarViewModel';
import { getCurrentUserId } from '../../services/IdentityService';
import { tokens } from '../../config/tokens';
import { getFirstName } from '../../utils/partners';
import type { CalendarEvent } from '../../types/calendar';
import type { Task } from '../../types/tasks';
import type { AppUser } from '../../types/connections';

const PRI_COLORS = tokens.priority;

type PriorityKey = keyof typeof PRI_COLORS;

interface Props {
  selectedDate: string;
  todayKey: string;
  dayEvents: CalendarEvent[];
  dayTasks: Task[];
  dayAnim: { value: number } | null;
  theme: Record<string, unknown>;
  users: AppUser[];
  others: AppUser[];
  overlapMap: Record<string, boolean>;
  onEventPress: (event: CalendarEvent) => void;
  onEventLongPress: (event: CalendarEvent) => void;
  timeFormat: string;
}

function AgendaList({ selectedDate, todayKey, dayEvents, dayTasks, dayAnim, theme, users, others, overlapMap, onEventPress, onEventLongPress, timeFormat }: Props) {
  // ── ViewModel: all copy decisions ───────────────────────
  const vm = useCalendarViewModel({ selectedDate, todayKey, dayEvents, dayTasks });

  return (
    <View style={s.content}>
      {/* Day header */}
      <View style={[s.dayHead, vm.dayHeader.isToday && { borderLeftWidth: 3, borderLeftColor: theme.accent.primary, paddingLeft: 10 }]}
        accessibilityRole="header">
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 18, fontWeight: '700', color: vm.dayHeader.isToday ? theme.accent.primary : theme.text.primary }}>
            {vm.dayHeader.title}
          </AppText>
          <AppText variant="caption" color="tertiary">{vm.dayHeader.subtitle}</AppText>
        </View>
      </View>

      {/* Events */}
      {dayEvents.length === 0 ? (
        <Card style={s.empty}>
          <Feather name="sun" size={18} color={theme.text.tertiary} />
          <AppText variant="caption" color="secondary" style={{ marginLeft: 10 }}>{vm.emptyLabel}</AppText>
        </Card>
      ) : dayEvents.map((item: CalendarEvent, idx: number) => (
        <EventCard key={item.id} item={item} index={idx} dayAnim={dayAnim} theme={theme}
          users={users} overlapMap={overlapMap} onPress={onEventPress} onLongPress={onEventLongPress} timeFormat={timeFormat} />
      ))}

      {/* Tasks */}
      {vm.taskLabel && (
        <>
          <AppText variant="caption" color="tertiary" style={[s.label, { marginTop: 16 }]}>{vm.taskLabel}</AppText>
          <Card padded={false}>
            {dayTasks.map((t: Task, idx: number) => {
              const priColor = (t?.priority ? PRI_COLORS[t.priority as PriorityKey] : undefined);
              const myId = getCurrentUserId();
              const assignedUser = t.assignedTo && t.assignedTo !== myId
                ? others.find((u) => u.id === t.assignedTo) : null;
              const isShared = (t.sharedWith?.length > 0) || assignedUser;
              return (
                <View key={t.id} style={[s.taskRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.divider }]}
                  accessibilityLabel={`${t.text}${t.completed ? ', done' : ''}${t.priority ? `, ${t.priority} priority` : ''}`}>
                  <View style={[s.check, { borderColor: t.completed ? theme.accent.primary : (priColor || theme.border), backgroundColor: t.completed ? theme.accent.primary : 'transparent' }]}>
                    {t.completed && <Feather name="check" size={12} color="#FFF" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <AppText variant="body" style={{ flex: 1, opacity: t.completed ? 0.4 : 1, textDecorationLine: t.completed ? 'line-through' : 'none' }}>{t.text}</AppText>
                      {assignedUser && <Avatar name={assignedUser.name} color={assignedUser.color} size={18} />}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      {!!t.dueTime && <AppText variant="caption" color="secondary">{t.dueTime}</AppText>}
                      {!!t.priority && <View style={[s.badge, { backgroundColor: (priColor || '#999') + '18' }]}><AppText style={{ fontSize: 10, fontWeight: '700', color: priColor }}>{String(t.priority).toUpperCase()}</AppText></View>}
                      {isShared && (
                        <View style={[s.badge, { backgroundColor: assignedUser ? assignedUser.color + '15' : theme.accent.light }]}>
                          <AppText style={{ fontSize: 10, fontWeight: '600', color: assignedUser ? assignedUser.color : theme.accent.primary }}>
                            {assignedUser ? getFirstName(assignedUser.name) : 'together'}
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </View>
  );
}

export default React.memo(AgendaList);

const s = StyleSheet.create({
  content: { paddingHorizontal: tokens.space.lg },
  dayHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingTop: 8 },
  label: { marginBottom: 8, letterSpacing: 0.5 },
  empty: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.base, paddingVertical: 12 },
  check: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
