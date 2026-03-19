import type { AppUser } from '../types/connections';
import React, { useMemo, useState, useCallback, memo } from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';
import { Alert, ScrollView, TouchableOpacity, View, StyleSheet , RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import CalendarService from '../services/CalendarService';
import { useUsers } from '../hooks/useUsers';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import WrapRow from '../ui/components/WrapRow';
import AppText from '../ui/components/AppText';
import Avatar from '../ui/components/Avatar';
import Button from '../ui/components/Button';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import { eventSharing } from '../insights';
import { getIntentInsight } from '../services/EventIntent';
import { logError } from '../services/logger';
import { confirmDelete } from '../utils/confirmDialog';
import { todayKey } from '../utils/dateTime';
import type { CalendarEvent } from '../types/calendar';
import { normalizeEventIntent } from '../types/calendar';
import { getCurrentUserId } from '../services/IdentityService';
import { getFirstName } from '../utils/partners';

function fmtDate(d) {
  try {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(d || '');
  }
}

function fmtTime(t) {
  try {
    if (!t) return '';
    // Support either "HH:mm" strings or ISO datetimes
    if (typeof t === 'string' && t.includes('T')) {
      const dt = new Date(t);
      if (!Number.isNaN(dt.getTime())) {
        return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      }
    }
    if (typeof t === 'string' && /^\d{1,2}:\d{2}/.test(t)) {
      const [h, m] = t.split(':').map(Number);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      }
    }
    return String(t);
  } catch {
    return String(t || '');
  }
}

function formatReminderTime(minutes) {
  if (minutes === 0) return 'At event time';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} before`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'} before`;
  }
  const days = Math.floor(minutes / 1440);
  return `${days} day${days === 1 ? '' : 's'} before`;
}

const QUICK_TIMES = ['18:00','18:30','19:00','19:30','20:00','20:30'];
const RSVP_LABEL = { accepted: 'Accepted', pending: 'Pending', declined: 'Declined' };
const RSVP_ICON = { accepted: 'check-circle', pending: 'clock', declined: 'x-circle' };

type Props = StackScreenProps<RootStackParamList, 'EventDetails'>;

interface ProposalRowProps {
  proposal: { id: string; date: string; time: string; proposedBy: string; by?: string; status: string; durationMinutes?: number; label?: string; fromName?: string };
  theme: Record<string, unknown>;
  onAccept: (proposal: { id: string; date: string; time: string; proposedBy: string; by?: string; status: string; durationMinutes?: number }) => void;
}
const ProposalRow = memo(function ProposalRow({ proposal, theme, onAccept }: ProposalRowProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: tokens.space.md }}>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{proposal.label || proposal.date}</AppText>
        <AppText variant="caption" color="secondary">{proposal.fromName || 'Suggestion'}</AppText>
      </View>
      {onAccept && (
        <TouchableOpacity onPress={() => onAccept(proposal)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: tokens.radius.pill, backgroundColor: theme.accent.primary + '15' }}>
          <AppText variant="caption" style={{ color: theme.accent.primary, fontWeight: '600' }}>Accept</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
});

export default function EventDetailsScreen({ navigation, route }: Props) {
  const { theme } = useAppTheme();
  const initialEvent = (route?.params?.event as CalendarEvent | undefined) ?? undefined;
  const { users } = useUsers();

  const meId = getCurrentUserId();
  const [event, setEvent] = useState<CalendarEvent | null>(initialEvent ?? null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestDate, setSuggestDate] = useState(initialEvent?.date || '');
  const [suggestTime, setSuggestTime] = useState('19:00');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const intent = normalizeEventIntent(event?.intent);

  const refresh = useCallback(async () => {
    try {
      if (!event?.id) return;
      const latest = await CalendarService.getEventById(event.id);
      if (latest) setEvent(latest);
    } catch (e) { logError('EventDetailsScreen', e); }
  }, [event?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Guard: if no event, show error state instead of crashing
  if (!event) {
    return (
      <Screen>
        <Header
          title="Event"
          leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <AppText variant="body" color="secondary">Event not found.</AppText>
          <Button title="Go back" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
        </View>
      </Screen>
    );
  }

  const creator = users.find((u: AppUser) => u.id === event.createdBy);
  const shared = users.filter((u: AppUser) => event.sharedWith?.includes(u.id));
  const isOrganiser = event.createdBy === meId;
  const isInvited = (event.sharedWith || []).includes(meId) && !isOrganiser;

  const rsvp = event.rsvp || {};
  const myRsvp = rsvp[meId] || (isOrganiser ? 'accepted' : (isInvited ? 'pending' : null));

  const sharingInsight = eventSharing(shared.length, isOrganiser);

  const PersonChip = ({ user, label, icon, status }) => (
    <View style={[s.personChip, { backgroundColor: theme.bg.subtle }]}>
      <Avatar name={user.name} color={user.color} uri={user.avatar} size={28} />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <AppText variant="label" style={{ fontSize: 13 }}>{user.name}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap:'wrap' }}>
          <Feather name={icon} size={12} color={theme.text.tertiary} style={{ marginRight: 4 }} />
          <AppText style={{ fontSize: 11, color: theme.text.tertiary }}>{label}</AppText>
          {status ? (
            <>
              <View style={{ width: 6 }} />
              <Feather name={RSVP_ICON[status] || 'clock'} size={12} color={status==='accepted' ? theme.accent.primary : theme.text.tertiary} style={{ marginRight: 4 }} />
              <AppText style={{ fontSize: 11, color: status==='accepted' ? theme.accent.primary : theme.text.tertiary }}>
                {RSVP_LABEL[status] || 'Pending'}
              </AppText>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );

  const accept = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await CalendarService.respondToInvite(event.id, 'accepted', { userId: meId });
      haptics.success();
      await refresh();
    } catch { haptics.error(); }
    finally { setSaving(false); }
  }, [saving, event?.id, refresh]);

  const decline = useCallback(async () => {
    if (saving) return;
    Alert.alert('Decline this invite?', 'You can also suggest another time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        setSaving(true);
        try {
          await CalendarService.respondToInvite(event.id, 'declined', { userId: meId });
          haptics.success(); await refresh();
        } catch { haptics.error(); }
        finally { setSaving(false); }
      } },
    ]);
  }, [saving, event?.id, refresh]);

  const propose = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await CalendarService.proposeAlternative(event.id, {
        date: suggestDate,
        time: suggestTime,
        durationMinutes: event.durationMinutes || 90,
        note: 'Suggested a better time',
      }, { userId: meId });

      // Mark as declined-with-alternative (premium feel: honest signal + solution)
      await CalendarService.respondToInvite(event.id, 'declined', { userId: meId, note: 'Suggested an alternative time.' });

      haptics.success();
      setSuggesting(false);
      await refresh();
    } catch { haptics.error(); }
    finally { setSaving(false); }
  }, [saving, event?.id, suggestDate, suggestTime, event?.durationMinutes, refresh]);

  const acceptProposal = useCallback(async (proposalId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await CalendarService.acceptProposal(event.id, proposalId, { userId: meId });
      haptics.success();
      await refresh();
    } catch { haptics.error(); }
    finally { setSaving(false); }
  }, [saving, event?.id, refresh]);

  const rejectProposal = useCallback(async (proposalId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await CalendarService.rejectProposal(event.id, proposalId, { userId: meId, note: 'Not possible — try another slot' });
      haptics.success();
      await refresh();
    } catch { haptics.error(); }
    finally { setSaving(false); }
  }, [saving, event?.id, refresh]);

  const dateChips = useMemo(() => {
    const d0 = new Date();
    const d1 = new Date(); d1.setDate(d1.getDate()+1);
    const d2 = new Date(); d2.setDate(d2.getDate()+2);
    const weekend = new Date();
    while (weekend.getDay() !== 6) weekend.setDate(weekend.getDate()+1); // next Sat
    const toKey = (d: Date) => todayKey(d);
    return [
      { key: toKey(d0), label: 'Today' },
      { key: toKey(d1), label: 'Tomorrow' },
      { key: toKey(d2), label: 'In 2 days' },
      { key: toKey(weekend), label: 'This Sat' },
    ];
  }, []);

  const openProposals = (event.proposals || []).filter((p) => p.status === 'pending').slice(-5);
  const rescheduleCount = event.rescheduleCount || (event.reschedules || []).length || 0;

  return (
    <Screen>
      <Header title="Event" leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
      <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} />} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <Card style={[s.hero, { backgroundColor: event.color || theme.accent.primary }]}>
          <AppText variant="title" numberOfLines={2} style={{ color: theme.text.inverse }}>{event.icon ? `${event.icon} ` : ''}{event.title}</AppText>
          <AppText variant="bodySm" style={{ color: theme.text.inverse, opacity: 0.85, marginTop: 4 }}>{fmtDate(event.date)} · {fmtTime(event.time)}</AppText>
          <View style={s.heroSharing}>
            <Feather name={isOrganiser ? 'edit-3' : 'user'} size={12} color={theme.text.inverse} />
            <AppText style={{ fontSize: 11, color: theme.text.inverse, opacity: 0.7, marginLeft: 4 }}>
              {isOrganiser ? 'You organised' : `${getFirstName(creator?.name, 'Someone')} organised`}
            </AppText>
            {shared.length > 0 && (
              <>
                <View style={s.heroDivider} />
                <Feather name="users" size={12} color={theme.text.inverse} />
                <AppText style={{ fontSize: 11, color: theme.text.inverse, opacity: 0.7, marginLeft: 4 }}>
                  {shared.length + 1} people
                </AppText>
              </>
            )}
            {isInvited && (
              <>
                <View style={s.heroDivider} />
                <Feather name={RSVP_ICON[myRsvp] || 'clock'} size={12} color={theme.text.inverse} />
                <AppText style={{ fontSize: 11, color: theme.text.inverse, opacity: 0.7, marginLeft: 4 }}>
                  {RSVP_LABEL[myRsvp] || 'Pending'}
                </AppText>
              </>
            )}
          </View>
        </Card>

        {sharingInsight ? (
          <AppText variant="bodySm" color="tertiary" style={{ fontStyle: 'italic', marginTop: 8, paddingHorizontal: 2 }}>{sharingInsight}</AppText>
        ) : null}

        {/* Intent */}
        {event.intent && (
          <Card style={s.mt12}>
            <View style={s.rowCenter}>
              <AppText style={{ fontSize: 20 }}>{intent?.kind === 'preset' ? intent.emoji : intent?.emoji}</AppText>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <AppText variant="label">{intent?.label}</AppText>
                <AppText variant="caption" color="tertiary" style={{ fontStyle: 'italic', marginTop: 2 }}>
                  {getIntentInsight(intent?.kind === 'preset' ? intent.id : undefined) || ''}
                </AppText>
              </View>
            </View>
          </Card>
        )}

        {/* Premium: RSVP & Proposals */}
        {(isInvited || isOrganiser) && (
          <Card style={s.mt12}>
            <View style={s.detailLabel}>
              <Feather name="mail" size={14} color={theme.text.tertiary} />
              <AppText variant="caption" color="secondary" style={s.ml6}>Invite status</AppText>
              {!!rescheduleCount && (
                <AppText variant="caption" color="muted" style={s.ml10}>• Rescheduled {rescheduleCount}×</AppText>
              )}
              {event.requiresReconfirm ? (
                <AppText variant="caption" style={{ marginLeft: 10, color: theme.accent.primary }}>Reconfirm needed</AppText>
              ) : null}
            </View>

            <View style={s.mt10}>
              <PersonChip
                user={creator || { name: 'You', color: theme.accent.primary }}
                label="Organiser"
                icon="edit-3"
                status={rsvp[event.createdBy] || 'accepted'}
              />
              {shared.map((u: AppUser) => (
                <PersonChip key={u.id} user={u} label="Invited" icon="eye" status={rsvp[u.id] || 'pending'} />
              ))}
            </View>

            {isInvited && (
              <View style={s.mt10}>
                <View style={{ flexDirection:'row', gap: 12 }}>
                  <Button title="Accept" onPress={accept} loading={saving} />
                  <Button title="Decline" variant="secondary" onPress={decline} disabled={saving} />
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setSuggesting((v: boolean) => !v);
                  }}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  style={[s.suggestToggle, { borderColor: theme.divider }]}
                >
                  <Feather name="repeat" size={14} color={theme.text.secondary} />
                  <AppText style={{ marginLeft: 8, color: theme.text.secondary, fontWeight:'700' }}>
                    {suggesting ? 'Hide' : 'Suggest another time'}
                  </AppText>
                </TouchableOpacity>

                {suggesting && (
                  <View style={s.mt8}>
                    <AppText variant="caption" color="secondary">Date</AppText>
                    <WrapRow spacing={8} style={s.chipRow}>
                      {dateChips.map((d: { key: string; label: string }) => (
                        <TouchableOpacity
                          key={d.key}
                          onPress={() => {
                            setSuggestDate(d.key);
                          }}
                          accessibilityRole="button"
                          style={[s.chip, { backgroundColor: suggestDate === d.key ? theme.accent.light : theme.bg.subtle }]}
                          activeOpacity={0.85}
                        >
                          <AppText variant="caption" style={{ color: suggestDate===d.key ? theme.accent.primary : theme.text.secondary }}>{d.label}</AppText>
                        </TouchableOpacity>
                      ))}
                    </WrapRow>

                    <AppText variant="caption" color="secondary" style={s.mt10}>Time</AppText>
                    <WrapRow spacing={8} style={s.chipRow}>
                      {QUICK_TIMES.map((t, idx) => (
                        <TouchableOpacity
                          key={`${t}-${idx}`}
                          onPress={() => {
                            setSuggestTime(t);
                          }}
                          accessibilityRole="button"
                          style={[s.chip, { backgroundColor: suggestTime === t ? theme.accent.light : theme.bg.subtle }]}
                          activeOpacity={0.85}
                        >
                          <AppText variant="caption" style={{ color: suggestTime===t ? theme.accent.primary : theme.text.secondary }}>{t}</AppText>
                        </TouchableOpacity>
                      ))}
                    </WrapRow>

                    <View style={s.mt12}>
                      <Button title="Send suggestion" onPress={propose} loading={saving} />
                    </View>
                  </View>
                )}
              </View>
            )}

            {isOrganiser && openProposals.length > 0 && (
              <View style={s.mt12}>
                <AppText variant="caption" color="secondary">Proposed alternatives</AppText>
                <View style={s.mt8}>
                  {openProposals.map((p) => (
                    <View key={p.id} style={[s.proposalRow, { backgroundColor: theme.bg.subtle, borderColor: theme.divider }]}>
                      <View style={s.flex1}>
                        <AppText style={{ fontWeight:'800', color: theme.text.primary }}>{fmtDate(p.date)} · {fmtTime(p.time)}</AppText>
                        <AppText variant="caption" color="tertiary" style={s.mt2}>
                          Proposed by {getFirstName(users.find((u: AppUser) => u.id===p.by)?.name, 'someone')}
                        </AppText>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          acceptProposal(p.id);
                        }}
                        accessibilityRole="button"
                        style={[s.pillBtn, { backgroundColor: theme.accent.primary }]}
                        activeOpacity={0.85}
                      >
                        <Feather name="check" size={14} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          rejectProposal(p.id);
                        }}
                        accessibilityRole="button"
                        style={[s.pillBtn, { backgroundColor: theme.bg.muted, borderColor: theme.divider, borderWidth: 1 }]}
                        activeOpacity={0.85}
                      >
                        <Feather name="x" size={14} color={theme.text.secondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Notes */}
        {!!event.description && (
          <Card style={s.mt12}>
            <View style={s.detailLabel}><Feather name="file-text" size={14} color={theme.text.tertiary} /><AppText variant="caption" color="secondary" style={s.ml6}>Notes</AppText></View>
            <AppText variant="body" style={s.mt6}>{event.description}</AppText>
          </Card>
        )}

        {/* Details */}
        <Card style={s.mt12}>
          {event.durationMinutes && (
            <View style={s.detailRow}>
              <Feather name="clock" size={14} color={theme.text.tertiary} />
              <AppText variant="caption" color="secondary" style={s.detailKey}>Duration</AppText>
              <AppText variant="body">{event.durationMinutes < 60 ? `${event.durationMinutes} minutes` : `${event.durationMinutes / 60} hour${event.durationMinutes > 60 ? 's' : ''}`}</AppText>
            </View>
          )}
          {event.reminder?.enabled && (
            <View style={[s.detailRow, { marginTop: 10 }]}>
              <Feather name="bell" size={14} color={theme.text.tertiary} />
              <AppText variant="caption" color="secondary" style={s.detailKey}>Reminder</AppText>
              <AppText variant="body">{formatReminderTime(event.reminder.minutesBefore)}</AppText>
            </View>
          )}
        </Card>


        {/* Edit (organiser only) */}
        {isOrganiser && !event.cancelled ? (
          <Button
            title="Edit event"
            onPress={() => {
              haptics.light();
              navigation.navigate('AddEvent', { mode: 'edit', eventId: event.id });
            }}
            style={s.mt12}
          />
        ) : null}


        {/* Cancel / Restore (premium reliability tracking) */}
        {!event.cancelled ? (
          <Button title="Cancel event" variant="secondary" onPress={() => {
            Alert.alert('Cancel this event?', 'This keeps the event history (useful for your Relationship Engine).', [
              { text: 'Keep', style: 'cancel' },
              { text: 'Cancel event', style: 'destructive', onPress: async () => {
                try {
                  await CalendarService.cancelEvent(event.id, { reason: 'User cancelled' });
                  haptics.success();
                  navigation.goBack();
                } catch { haptics.error(); }
              } },
            ]);
          }} style={s.mt12} />
        ) : (
          <Button
            title="Restore event"
            variant="secondary"
            onPress={async () => {
              try {
              await CalendarService.updateEvent(event.id, { cancelled: false });
              haptics.success();
              navigation.goBack();
            } catch {
              haptics.error();
            }
          }}
            style={s.mt12}
          />
        )}


        {/* Delete */}
        <Button title="Delete event" variant="danger" onPress={() => {
          confirmDelete(event.title || event.name || 'Event', async () => {
            try {
              await CalendarService.deleteEvent(event.id);
              haptics.success();
              navigation.goBack();
            } catch {
              haptics.error();
            }
          }, { message: 'This event will be permanently deleted. This cannot be undone.' });
        }} style={{ marginTop: tokens.space.xl }} />

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { padding: tokens.space.lg, paddingBottom: 40 },
  hero: { padding: tokens.space.xl, borderRadius: tokens.radius.xl },
  heroSharing: { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' },
  heroDivider: { width: 1, height: 12, backgroundColor: 'rgba(128,128,128,0.3)', marginHorizontal: 8 },
  detailLabel: { flexDirection: 'row', alignItems: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailKey: { marginLeft: 6, width: 72 },

  personChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, marginBottom: 6 },

  suggestToggle: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection:'row', alignItems:'center' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: tokens.radius.pill },

  proposalRow: { flexDirection:'row', alignItems:'center', padding: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8, marginBottom: 8 },
  pillBtn: { width: 34, height: 34, borderRadius: 12, alignItems:'center', justifyContent:'center' },
  flex1: { flex: 1 },
  ml10: { marginLeft: 10 },
  ml6: { marginLeft: 6 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  mt2: { marginTop: 2 },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
});