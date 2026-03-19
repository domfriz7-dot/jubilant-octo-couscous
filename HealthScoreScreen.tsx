/**
 * InviteScreen — Full invite lifecycle.
 *
 * Three sections:
 *   1. YOUR CODE — share with others (copy, share sheet, regenerate)
 *   2. ENTER CODE — accept someone else's invite
 *   3. INVITE HISTORY — pending, accepted, expired invites
 *   4. CONNECTIONS — manage linked people
 */

import React, { useCallback, useState, memo } from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import {
  Alert, RefreshControl, ScrollView, Share, TouchableOpacity,
  View, StyleSheet, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import KeyboardScreen from '../ui/components/KeyboardScreen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import SectionHeader from '../ui/components/SectionHeader';
import Input from '../ui/components/Input';
import Button from '../ui/components/Button';
import Avatar from '../ui/components/Avatar';
import EmptyState from '../ui/components/EmptyState';
import { FadeIn } from '../ui/components/FadeIn';
import PressableScale from '../ui/components/PressableScale';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import InviteService from '../services/InviteService';
import { useInvites } from '../hooks/useInvites';
import type { RootStackParamList } from '../navigation/types';
import { useTranslate } from '../i18n';
import type { Connection } from '../types/connections';

type Props = StackScreenProps<RootStackParamList, 'Invite'>;

const REL_OPTIONS = [
  { id: 'partner', label: 'Partner', icon: 'heart' },
  { id: 'friend', label: 'Friend', icon: 'smile' },
  { id: 'family', label: 'Family', icon: 'home' },
  { id: 'colleague', label: 'Colleague', icon: 'briefcase' },
];

type ConnectionRowProps = {
  conn: Connection;
  theme: ReturnType<typeof useAppTheme>['theme'];
  onPress: (conn: Connection) => void;
  onRemove: (conn: Connection) => void;
};

const ConnectionRow = memo(function ConnectionRow({ conn, theme, onPress, onRemove }: ConnectionRowProps) {
  return (
    <PressableScale
      onPress={() => onPress(conn)}
      style={[{ flexDirection: 'row', alignItems: 'center', padding: tokens.space.base, borderRadius: tokens.radius.md, marginBottom: tokens.space.sm, backgroundColor: theme.bg.card, ...theme.shadow.sm }]}
      accessibilityRole="button"
      accessibilityLabel={conn.name}
    >
      <Avatar name={conn.name} color={conn.color} size={40} />
      <View style={{ flex: 1, marginLeft: tokens.space.md }}>
        <AppText variant="label" numberOfLines={1}>{conn.name}</AppText>
        <AppText variant="caption" color="secondary">
          {conn.relationship || 'Connected'}{conn.email ? ' · ' + conn.email : ''}
        </AppText>
      </View>
      <TouchableOpacity onPress={() => onRemove(conn)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.8}>
        <Feather name="x" size={16} color={theme.text.tertiary} />
      </TouchableOpacity>
    </PressableScale>
  );
});

export default function InviteScreen({ navigation, route }: Props) {
  const { theme } = useAppTheme();
  const tr = useTranslate();
  const insets = useSafeAreaInsets();
  const prefillCode = route?.params?.prefillCode;
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('share'); // 'share' | 'accept'

  const {
    myCode, regenerateCode,
    sentInvites, pendingInvites,
    createInvite, revokeInvite, resendInvite,
    acceptCode, setAcceptCode,
    acceptName, setAcceptName,
    acceptRelationship, setAcceptRelationship,
    isAcceptValid, lookupResult, lookupLoading, lookupCode,
    acceptInvite,
    connections, removeConnection,
    loading, reload,
  } = useInvites({ prefillCode });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  // ── Share actions ─────────────────────────────────────────
  const copyCode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(myCode);
      haptics.success();
      Alert.alert(tr('Copied!'), tr(`Code ${myCode} copied to clipboard.`));
    } catch { haptics.error(); }
  }, [myCode]);

  const shareCode = useCallback(async () => {
    try {
      const message = InviteService.buildShareMessage(myCode, 'I');
      await Share.share({ message, title: tr('Invites') });
      haptics.light();
    } catch { haptics.error(); }
  }, [myCode]);

  const handleRegenerate = useCallback(async () => {
    Alert.alert(
      tr('New code?'),
      tr('This will invalidate your current code. Anyone who has it won\'t be able to use it.'),
      [
        { text: tr('Cancel'), style: 'cancel' },
        {
          text: tr('Regenerate'), style: 'destructive',
          onPress: async () => {
            await regenerateCode();
            haptics.success();
          }
        },
      ]
    );
  }, [regenerateCode]);

  // ── Quick invite (email/share) ────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('');

  const sendEmailInvite = useCallback(async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      haptics.error();
      Alert.alert(tr('Invalid email'), tr('Please enter a valid email address.'));
      return;
    }
    try {
      const invite = await createInvite({ toEmail: email });
      const message = InviteService.buildShareMessage(invite.code, 'I');
      await Share.share({ message });
      setInviteEmail('');
      haptics.success();
    } catch (e) {
      haptics.error();
      const message = e instanceof Error ? e.message : tr('Could not create invite.');
      Alert.alert(tr('Error'), message);
    }
  }, [inviteEmail, createInvite]);

  // ── Accept flow ───────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    try {
      const conn = await acceptInvite();
      haptics.success();
      Alert.alert(
        tr('Connected! 🎉'),
        tr(`You're now connected with ${conn.name}. Start planning together!`),
        [
          { text: tr('View'), onPress: () => navigation.navigate('ConnectionDetail', { user: conn }) },
          { text: 'OK' },
        ]
      );
    } catch (e) {
      haptics.error();
      const message = e instanceof Error ? e.message : tr('Check the code and try again.');
      Alert.alert(tr('Could not connect'), message);
    }
  }, [acceptInvite, navigation]);

  const handleRemoveConnection = useCallback((conn: Connection) => {
    Alert.alert(
      `Remove ${conn.name}?`,
      'You\'ll no longer share events. They can reconnect with a new invite.',
      [
        { text: tr('Cancel'), style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await removeConnection(conn.id);
            haptics.light();
          }
        },
      ]
    );
  }, [removeConnection]);

  // ── Format helpers ────────────────────────────────────────
  const fmtTime = (ms?: number | null) => {
    if (!ms) return '';
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const timeLeft = (expiresAt?: number | null) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days > 0) return `${days}d left`;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h left`;
  };

  const STATUS_COLORS = {
    pending: tokens.palette.amber,
    accepted: tokens.palette.sage,
    expired: tokens.palette.stone,
    revoked: tokens.palette.stone,
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <KeyboardScreen keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(0, insets.top) + 72 : 24}>
      <Header
        title={tr('Invites')}
        subtitle={`${connections.length} connection${connections.length !== 1 ? 's' : ''}`}
        leftAction={{ icon: 'arrow-left', label: tr('Back'), onPress: () => navigation.goBack() }}
      />

      <ScrollView style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} />
        }
      >
        {/* ── TAB SWITCHER ── */}
        <View style={[s.tabs, { backgroundColor: theme.bg.subtle }]}>
          {[
            { id: 'share', label: tr('Share Code'), icon: 'share-2' },
            { id: 'accept', label: tr('Enter Code'), icon: 'log-in' },
          ].map((t: { id: string; label: string; icon?: string }) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => { haptics.light(); setTab(t.id); }}
              style={[s.tab, tab === t.id && { backgroundColor: theme.bg.card, ...tokens.shadow.sm }]}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.id }}
            >
              <Feather name={t.icon} size={14} color={tab === t.id ? theme.accent.primary : theme.text.tertiary} />
              <AppText
                variant="label"
                style={[s.tabText, { color: tab === t.id ? theme.accent.primary : theme.text.tertiary }]}
              >
                {t.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ SHARE TAB ═══ */}
        {tab === 'share' && (
          <FadeIn>
            {pendingInvites.length > 0 && (
              <Card style={s.pendingSummaryCard}>
                <AppText variant="caption" color="tertiary" style={s.sectionLabel}>{tr('CONNECTION STATUS')}</AppText>
                <AppText variant="label">{pendingInvites.length} invite{pendingInvites.length !== 1 ? 's' : ''} waiting for acceptance</AppText>
                <AppText variant="bodySm" color="secondary" style={{ marginTop: 6 }}>
                  {tr('Pending invites do not become full connections until the other person accepts.')}
                </AppText>
              </Card>
            )}

            {/* Your Code */}
            <Card style={s.codeCard}>
              <AppText variant="caption" color="tertiary" style={s.sectionLabel}>YOUR INVITE CODE</AppText>
              <View style={[s.codeBox, { borderColor: theme.accent.primary + '30', backgroundColor: theme.accent.primary + '08' }]}>
                <AppText style={[s.codeText, { color: theme.accent.primary }]}>
                  {myCode || '------'}
                </AppText>
              </View>
              <AppText variant="caption" color="secondary" style={s.codeHint}>
                Share this with someone to connect. They enter it in the app.
              </AppText>

              <View style={s.codeActions}>
                <View style={[s.codeActionHalf, s.mr12]}>
                  <Button title="Copy" variant="secondary" size="sm" onPress={copyCode} />
                </View>
                <View style={s.codeActionHalf}>
                  <Button title="Share" size="sm" onPress={shareCode} />
                </View>
              </View>

              <TouchableOpacity onPress={handleRegenerate} style={s.regenBtn} activeOpacity={0.8} accessibilityRole="button">
                <Feather name="refresh-cw" size={12} color={theme.text.tertiary} />
                <AppText variant="caption" color="tertiary" style={s.regenText}>Get a new code</AppText>
              </TouchableOpacity>
            </Card>

            {/* Quick Invite by Email */}
            <Card style={s.sectionCard}>
              <AppText variant="caption" color="tertiary" style={s.sectionLabel}>INVITE BY EMAIL</AppText>
              <AppText variant="bodySm" color="secondary" style={s.sectionHint}>
                We'll open the share sheet with your invite code.
              </AppText>
              <Input
                label="Email"
                placeholder="friend@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={inviteEmail}
                onChangeText={setInviteEmail}
              />
              <Button
                title="Send Invite"
                onPress={sendEmailInvite}
                style={s.sectionBtn}
                disabled={!inviteEmail.trim().includes('@')}
              />
            </Card>

            {/* Pending Invites */}
            {sentInvites.length > 0 && (
              <View style={s.historySection}>
                <AppText variant="caption" color="tertiary" style={s.sectionLabel}>INVITE HISTORY</AppText>
                {sentInvites.slice(0, 10).map((inv: { id: string; code?: string; toEmail?: string; toName?: string; status?: string; createdAt?: number }) => (
                  <PressableScale key={inv.id} style={[s.inviteRow, { backgroundColor: theme.bg.card }]}>
                    <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[inv.status] || theme.text.tertiary }]} />
                    <View style={s.inviteBody}>
                      <AppText variant="label" numberOfLines={1}>
                        {inv.toEmail || inv.toName || `Code: ${inv.code}`}
                      </AppText>
                      <AppText variant="caption" color="secondary">
                        {inv.status === 'pending' && timeLeft(inv.expiresAt)}
                        {inv.status === 'accepted' && `Accepted ${fmtTime(inv.acceptedAt)}`}
                        {inv.status === 'expired' && 'Expired'}
                        {inv.status === 'revoked' && 'Cancelled'}
                      </AppText>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[inv.status] + '20' }]}>
                      <AppText style={[s.statusText, { color: STATUS_COLORS[inv.status] }]}>
                        {inv.status}
                      </AppText>
                    </View>
                    {inv.status === 'pending' && (
                      <View style={s.inviteActions}>
                        <TouchableOpacity
                          onPress={() => { haptics.light(); resendInvite(inv.id); }}
                          style={s.inviteActionBtn}
                          activeOpacity={0.8}
                          accessibilityRole="button" accessibilityLabel="Resend invite"
                        >
                          <Feather name="send" size={14} color={theme.accent.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert('Cancel invite?', `This will revoke the code ${inv.code}.`, [
                              { text: 'Keep', style: 'cancel' },
                              { text: 'Cancel', style: 'destructive', onPress: () => revokeInvite(inv.id) },
                            ]);
                          }}
                          style={s.inviteActionBtn}
                          activeOpacity={0.8}
                          accessibilityRole="button" accessibilityLabel="Cancel invite"
                        >
                          <Feather name="x" size={14} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    )}
                    {inv.status === 'expired' && (
                      <TouchableOpacity
                        onPress={() => { haptics.light(); resendInvite(inv.id); }}
                        style={[s.inviteActionBtn, { marginLeft: tokens.space.sm }]}
                        activeOpacity={0.8}
                        accessibilityRole="button" accessibilityLabel="Resend expired invite"
                      >
                        <Feather name="refresh-cw" size={14} color={theme.accent.primary} />
                      </TouchableOpacity>
                    )}
                  </PressableScale>
                ))}
              </View>
            )}
          </FadeIn>
        )}

        {/* ═══ ACCEPT TAB ═══ */}
        {tab === 'accept' && (
          <FadeIn>
            <Card style={s.sectionCard}>
              <AppText variant="caption" color="tertiary" style={s.sectionLabel}>ENTER INVITE CODE</AppText>
              <AppText variant="bodySm" color="secondary" style={s.sectionHint}>
                Enter the code someone shared with you.
              </AppText>

              <Input
                placeholder="ABC123"
                maxLength={6}
                autoCapitalize="characters"
                value={acceptCode}
                onChangeText={(t: string) => {
                  const clean = t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                  setAcceptCode(clean);
                  if (clean.length >= 4) lookupCode(clean);
                }}
                style={s.codeInput}
              />

              {/* Lookup result preview */}
              {lookupResult && (
                <View style={[s.lookupPreview, { backgroundColor: theme.accent.primary + '08', borderColor: theme.accent.primary + '20' }]}>
                  <Feather name="check-circle" size={16} color={theme.accent.primary} />
                  <View style={s.lookupBody}>
                    <AppText variant="label">Invite from {lookupResult.fromName || 'someone'}</AppText>
                    {lookupResult.relationship && (
                      <AppText variant="caption" color="secondary">
                        {lookupResult.relationship} · {timeLeft(lookupResult.expiresAt)}
                      </AppText>
                    )}
                  </View>
                </View>
              )}

              {/* Name + Relationship for accept */}
              <View style={s.acceptFields}>
                <Input
                  label="Your name (shown to them)"
                  placeholder="Your name"
                  value={acceptName}
                  onChangeText={setAcceptName}
                  autoCapitalize="words"
                />
                <AppText variant="caption" color="secondary" style={s.relLabel}>Relationship</AppText>
                <View style={s.relRow}>
                  {REL_OPTIONS.map((opt: { id: string; label: string; icon?: string }) => (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => { haptics.light(); setAcceptRelationship(opt.id); }}
                      style={[
                        s.relChip,
                        {
                          backgroundColor: acceptRelationship === opt.id ? theme.accent.primary : theme.bg.subtle,
                          borderColor: acceptRelationship === opt.id ? theme.accent.primary : theme.border,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: acceptRelationship === opt.id }}
                      activeOpacity={0.8}
                    >
                      <Feather
                        name={opt.icon}
                        size={12}
                        color={acceptRelationship === opt.id ? theme.text.inverse : theme.text.secondary}
                      />
                      <AppText
                        variant="caption"
                        style={[
                          s.relChipText,
                          { color: acceptRelationship === opt.id ? theme.text.inverse : theme.text.secondary },
                        ]}
                      >
                        {opt.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button
                title="Connect"
                onPress={handleAccept}
                disabled={!isAcceptValid}
                style={s.sectionBtn}
              />
            </Card>
          </FadeIn>
        )}

        {/* ═══ CONNECTIONS ═══ */}
        {connections.length > 0 && (
          <FadeIn delay={120}>
            <View style={s.connectionsSection}>
              <AppText variant="caption" color="tertiary" style={s.sectionLabel}>
                CONNECTED ({connections.length})
              </AppText>
              {connections.map((conn: { id: string; name: string; color?: string; status?: string }) => (
                <PressableScale
                  key={conn.id}
                  onPress={() => navigation.navigate('ConnectionDetail', { user: conn })}
                  style={[s.connRow, { backgroundColor: theme.bg.card }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${conn.name}, ${conn.relationship || 'connection'}`}
                >
                  <Avatar name={conn.name} color={conn.color} size={40} />
                  <View style={s.connBody}>
                    <AppText variant="label" numberOfLines={1}>{conn.name}</AppText>
                    <AppText variant="caption" color="secondary">
                      {conn.relationship || 'Connected'}{conn.email ? ` · ${conn.email}` : ''}
                    </AppText>
                    {conn.pairedAt && (
                      <AppText variant="caption" color="tertiary" style={s.connDate}>
                        Paired {fmtTime(conn.pairedAt)}
                      </AppText>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveConnection(conn)}
                    style={s.connRemove}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${conn.name}`}
                  >
                    <Feather name="x" size={16} color={theme.text.tertiary} />
                  </TouchableOpacity>
                </PressableScale>
              ))}
            </View>
          </FadeIn>
        )}

        {connections.length === 0 && !loading && (
          <FadeIn delay={120}>
            <EmptyState
              icon="users"
              title="No connections yet"
              message="Share your code or enter someone else's to get started."
            />
          </FadeIn>
        )}

        {/* Privacy note */}
        <FadeIn delay={180}>
          <View style={[s.privacyNote, { backgroundColor: theme.bg.subtle }]}>
            <Feather name="lock" size={14} color={theme.text.tertiary} />
            <AppText variant="caption" color="secondary" style={s.privacyText}>
              Connected people can see your shared event titles, dates, and times. You can remove connections any time.
            </AppText>
          </View>
        </FadeIn>

        <View style={{ height: tokens.space.xxl }} />
      </ScrollView>
    </KeyboardScreen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: tokens.space.lg, paddingBottom: 40 },

  // Tabs
  tabs: {
    flexDirection: 'row', borderRadius: tokens.radius.md,
    padding: 3, marginBottom: tokens.space.lg,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: tokens.radius.sm,
  },
  tabText: { marginLeft: 8 },

  // Simple spacing helpers (avoid relying on `gap`, which can be inconsistent across RN/iOS builds)
  mr12: { marginRight: 12 },

  // Code card
  codeCard: { marginBottom: tokens.space.lg },
  codeBox: {
    borderWidth: 1.5, borderRadius: tokens.radius.lg, borderStyle: 'dashed',
    paddingVertical: tokens.space.lg, alignItems: 'center', marginBottom: tokens.space.sm,
  },
  codeText: { fontSize: 32, fontWeight: '800', letterSpacing: 4 },
  codeHint: { textAlign: 'center', marginBottom: tokens.space.md },
  codeActions: { flexDirection: 'row' },
  codeActionHalf: { flex: 1 },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: tokens.space.md, paddingVertical: tokens.space.xs,
  },
  regenText: { marginLeft: tokens.space.xs },

  // Section cards
  sectionCard: { marginBottom: tokens.space.lg },
  sectionLabel: { letterSpacing: 0.8, marginBottom: tokens.space.sm },
  sectionHint: { marginBottom: tokens.space.md },
  sectionBtn: { marginTop: tokens.space.md },

  // Code input
  codeInput: { fontSize: 20, letterSpacing: 4, textAlign: 'center', fontWeight: '700' },

  // Lookup preview
  lookupPreview: {
    flexDirection: 'row', alignItems: 'center', padding: tokens.space.md,
    borderRadius: tokens.radius.md, borderWidth: 1, marginTop: tokens.space.sm,
  },
  lookupBody: { marginLeft: tokens.space.sm, flex: 1 },

  // Accept fields
  acceptFields: { marginTop: tokens.space.md },
  relLabel: { marginTop: tokens.space.md, marginBottom: tokens.space.sm },
  relRow: { flexDirection: 'row', flexWrap: 'wrap' },
  relChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm, borderRadius: tokens.radius.pill, borderWidth: 1,
    marginRight: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  relChipText: { marginLeft: tokens.space.xs },

  // Invite history
  historySection: { marginBottom: tokens.space.lg },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', padding: tokens.space.md,
    borderRadius: tokens.radius.md, marginBottom: tokens.space.sm, ...tokens.shadow.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: tokens.space.sm },
  inviteBody: { flex: 1 },
  statusBadge: {
    paddingHorizontal: tokens.space.sm, paddingVertical: 3, borderRadius: tokens.radius.pill,
    marginLeft: tokens.space.sm,
  },
  statusText: { fontSize: tokens.type.size.xxs, fontWeight: tokens.type.weight.semi, textTransform: 'capitalize' },
  inviteActions: { flexDirection: 'row', marginLeft: tokens.space.sm },
  inviteActionBtn: { padding: tokens.space.xs, marginLeft: tokens.space.xs },

  // Connections
  connectionsSection: { marginBottom: tokens.space.lg },
  pendingSummaryCard: { marginBottom: tokens.space.md },
  connRow: {
    flexDirection: 'row', alignItems: 'center', padding: tokens.space.md,
    borderRadius: tokens.radius.md, marginBottom: tokens.space.sm, ...tokens.shadow.sm,
  },
  connBody: { flex: 1, marginLeft: tokens.space.md },
  connDate: { marginTop: 2 },
  connRemove: { padding: tokens.space.xs },

  // Privacy
  privacyNote: {
    flexDirection: 'row', alignItems: 'flex-start', padding: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  privacyText: { marginLeft: tokens.space.sm, flex: 1 },
});
