import React from 'react';
import { Animated, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AppText from '../../ui/components/AppText';
import Card from '../../ui/components/Card';
import Avatar from '../../ui/components/Avatar';
import { formatTime } from '../../utils/dateTime';
import { eventByline } from '../../viewModels/useCalendarViewModel';
import type { ParsedEvent } from '../../types/calendar';
import type { AppUser } from '../../types/connections';

interface Props {
  item: ParsedEvent;
  index: number;
  dayAnim: InstanceType<typeof Animated.Value> | null;
  theme: Record<string, unknown>;
  users: AppUser[];
  overlapMap: Record<string, unknown>;
  onPress: (event: ParsedEvent) => void;
  onLongPress: (event: ParsedEvent) => void;
  timeFormat: string;
}

function EventCard({ item, index, dayAnim, theme, users, overlapMap, onPress, onLongPress, timeFormat }: Props) {
  const overlaps = overlapMap[item.id];
  const sharedUsers = users.filter((u) => item.sharedWith?.includes(u.id));
  const byline = eventByline(item, users);

  return (
    <Animated.View style={{
      opacity: dayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      transform: [{ translateY: dayAnim.interpolate({ inputRange: [0, 1], outputRange: [20 + index * 8, 0] }) }],
    }}>
      <TouchableOpacity
              accessibilityRole="button" activeOpacity={0.85} onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)} delayLongPress={400}
        accessibilityLabel={`${item.title}, ${formatTime(item._dt, timeFormat)}${sharedUsers.length > 0 ? `, with ${sharedUsers.map((u) => u.name).join(', ')}` : ''}`}
        accessibilityHint="Tap for details, hold to reschedule">
        <Card style={s.card}>
          <View style={[s.colorBar, { backgroundColor: item.color || theme.accent.primary }]} />
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>{item.icon ? `${item.icon} ` : ''}{item.title}</AppText>
              {sharedUsers.length > 0 && (
                <View style={s.avatarRow}>
                  {sharedUsers.slice(0, 3).map((u, i: number) => (
                    <View key={u.id} style={[s.miniAv, { marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i, borderColor: theme.bg.card }]}>
                      <Avatar name={u.name} color={u.color} uri={u.avatar} size={24} />
                    </View>
                  ))}
                  {sharedUsers.length > 3 && <AppText variant="caption" color="secondary" style={{ marginLeft: 4 }}>+{sharedUsers.length - 3}</AppText>}
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="clock" size={12} color={theme.text.tertiary} style={{ marginRight: 4 }} />
                <AppText variant="caption" color="secondary">{formatTime(item._dt, timeFormat)}</AppText>
              </View>
              {!!item.durationMinutes && <AppText variant="caption" color="secondary">{item.durationMinutes < 60 ? `${item.durationMinutes}m` : `${item.durationMinutes / 60}h`}</AppText>}
              {!!item.description && <AppText variant="caption" color="muted" numberOfLines={1} style={{ flex: 1 }}>{item.description}</AppText>}
            </View>
            {/* Byline — copy from viewModel */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
              <Feather name={byline.ownerIcon} size={12} color={theme.text.tertiary} />
              <AppText style={{ fontSize: 11, color: theme.text.tertiary }}>
                {byline.ownerLabel}  ·  {byline.sharingLabel}
              </AppText>
            </View>
            {overlaps?.length > 0 && (
              <View style={[s.overlap, { backgroundColor: theme.warning + '18' }]}>
                <Feather name="alert-triangle" size={12} color={theme.warning} style={{ marginRight: 3 }} />
                <AppText style={{ fontSize: 11, color: theme.warning }}>Overlaps with {overlaps[0]}{overlaps.length > 1 ? ` +${overlaps.length - 1}` : ''}</AppText>
              </View>
            )}
          </View>
          <Feather name="chevron-right" size={16} color={theme.text.tertiary} style={{ marginLeft: 8 }} />
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default React.memo(EventCard);

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingLeft: 0, marginBottom: 6 },
  colorBar: { width: 4, borderRadius: 2, alignSelf: 'stretch', minHeight: 44 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  miniAv: { borderWidth: 2, borderRadius: 14 },
  overlap: { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
});
