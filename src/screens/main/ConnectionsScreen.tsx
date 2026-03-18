import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE } from '../../ui/theme/tokens';
import useInvitations, { DisplayConnection } from '../../app/bootstrap/useInvitations';
import { FirestoreInvitation, sendInvitation, acceptInvitation, declineInvitation } from '../../services/InvitationService';

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  const initials = name.trim().charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ ...TYPOGRAPHY.bodyBold, color: PALETTE.white, fontSize: size * 0.4 }}>{initials}</Text>
    </View>
  );
}

// ─── Invitation card (incoming) ───────────────────────────────────────────────

interface InvitationCardProps {
  invitation: FirestoreInvitation;
  onAccept: (inv: FirestoreInvitation) => void;
  onDecline: (inv: FirestoreInvitation) => void;
  busy: boolean;
}

function InvitationCard({ invitation, onAccept, onDecline, busy }: InvitationCardProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.invCard, { backgroundColor: theme.bg.card, borderColor: theme.primary }]}>
      <View style={styles.invCardHeader}>
        <View style={[styles.invAvatar, { backgroundColor: theme.primary + '22' }]}>
          <Ionicons name="person-add" size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.invName, { color: theme.text.primary }]}>{invitation.fromName}</Text>
          <Text style={[styles.invEmail, { color: theme.text.secondary }]}>{invitation.fromEmail}</Text>
        </View>
      </View>
      <Text style={[styles.invLabel, { color: theme.text.secondary }]}>
        wants to share calendars with you
      </Text>
      <View style={styles.invActions}>
        <TouchableOpacity
          style={[styles.declineBtn, { borderColor: theme.border.default }]}
          onPress={() => onDecline(invitation)}
          disabled={busy}
          accessibilityLabel="Decline invitation"
          accessibilityRole="button"
        >
          <Text style={[styles.declineBtnText, { color: theme.text.secondary }]}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: theme.primary, opacity: busy ? 0.6 : 1 }]}
          onPress={() => onAccept(invitation)}
          disabled={busy}
          accessibilityLabel="Accept invitation"
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator size="small" color={PALETTE.white} />
          ) : (
            <Text style={styles.acceptBtnText}>Accept</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Outgoing invitation row ──────────────────────────────────────────────────

function OutgoingInvitationRow({ invitation }: { invitation: FirestoreInvitation }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.outgoingRow, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}>
      <Ionicons name="time-outline" size={18} color={theme.warning} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.outgoingEmail, { color: theme.text.primary }]}>{invitation.toEmail}</Text>
        <Text style={[styles.outgoingStatus, { color: theme.text.tertiary }]}>Invite pending</Text>
      </View>
    </View>
  );
}

// ─── Connection row ───────────────────────────────────────────────────────────

function ConnectionRow({ item }: { item: DisplayConnection }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.connectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
      <Avatar name={item.name} color={item.color} />
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: theme.text.primary }]}>{item.name}</Text>
        <Text style={[styles.connectionEmail, { color: theme.text.secondary }]}>{item.email}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={20} color={theme.success} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ConnectionsScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top } = useSafeAreaInsets();

  const {
    connections,
    incomingInvitations,
    outgoingInvitations,
    loading,
    firebaseEnabled,
    authenticated,
    uid,
    email,
    displayName,
  } = useInvitations();

  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);

  const filteredConnections = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Invite ─────────────────────────────────────────────────────────────────

  const handleSendInvite = async () => {
    const toEmail = inviteEmail.trim().toLowerCase();
    if (!toEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    if (!firebaseEnabled || !authenticated || !uid) {
      Alert.alert(
        'Sign in required',
        'Please sign in to send invitations to real users.',
        [{ text: 'OK' }]
      );
      return;
    }

    setInviting(true);
    const err = await sendInvitation(uid, email ?? '', displayName ?? email ?? '', toEmail);
    setInviting(false);

    if (err) {
      Alert.alert('Could not send invite', err);
    } else {
      setInviteEmail('');
      Alert.alert('Invite sent!', `An invitation has been sent to ${toEmail}. They'll be notified when they open the app.`);
    }
  };

  // ─── Accept / decline ────────────────────────────────────────────────────────

  const handleAccept = async (inv: FirestoreInvitation) => {
    if (!uid || busyInvitationId !== null) return;
    setBusyInvitationId(inv.id);
    const err = await acceptInvitation(inv.id, inv, uid, displayName ?? email ?? 'User');
    setBusyInvitationId(null);
    if (err) Alert.alert('Error', err);
  };

  const handleDecline = (inv: FirestoreInvitation) => {
    Alert.alert(
      'Decline invitation',
      `Decline the invite from ${inv.fromName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            if (busyInvitationId !== null) return;
            setBusyInvitationId(inv.id);
            const err = await declineInvitation(inv.id);
            setBusyInvitationId(null);
            if (err) Alert.alert('Error', err);
          },
        },
      ]
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const activeCount = connections.length;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      {/* Header */}
      <LinearGradient
        colors={theme.gradient.primary}
        style={[styles.header, { paddingTop: top + SPACING.lg }]}
      >
        <Text style={styles.headerTitle}>People</Text>
        <Text style={styles.headerSub}>
          {loading ? 'Loading…' : `${activeCount} ${activeCount === 1 ? 'connection' : 'connections'}`}
        </Text>
      </LinearGradient>

      <FlatList
        data={filteredConnections}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Incoming invitations */}
            {incomingInvitations.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>
                  Invitations
                </Text>
                {incomingInvitations.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    busy={busyInvitationId === inv.id}
                  />
                ))}
              </>
            )}

            {/* Outgoing pending invites */}
            {outgoingInvitations.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>
                  Sent invites
                </Text>
                {outgoingInvitations.map((inv) => (
                  <OutgoingInvitationRow key={inv.id} invitation={inv} />
                ))}
              </>
            )}

            {/* Invite input */}
            <View style={[styles.inviteCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}>
              <Text style={[styles.inviteTitle, { color: theme.text.primary }]}>Invite someone</Text>
              <Text style={[styles.inviteBody, { color: theme.text.secondary }]}>
                {firebaseEnabled && authenticated
                  ? 'Enter their email to share calendars.'
                  : 'Sign in to send real invitations.'}
              </Text>
              <View style={styles.inviteRow}>
                <TextInput
                  style={[styles.inviteInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text.primary, flex: 1 }]}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="their@email.com"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSendInvite}
                  editable={!inviting}
                />
                <TouchableOpacity
                  style={[
                    styles.inviteBtn,
                    { backgroundColor: theme.primary, opacity: inviteEmail.trim() && !inviting ? 1 : 0.4 },
                  ]}
                  disabled={!inviteEmail.trim() || inviting}
                  onPress={handleSendInvite}
                  accessibilityLabel="Send invite"
                  accessibilityRole="button"
                >
                  {inviting ? (
                    <ActivityIndicator size="small" color={PALETTE.white} />
                  ) : (
                    <Ionicons name="send" size={18} color={PALETTE.white} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Search (only if there are connections) */}
            {connections.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>
                  Your connections
                </Text>
                <View style={[styles.searchRow, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <Ionicons name="search" size={18} color={theme.text.tertiary} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text.primary }]}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search connections…"
                    placeholderTextColor={theme.text.tertiary}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {connections.length === 0 && !loading && (
              <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>
                Your connections
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centeredRow}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : search.length > 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No results for "{search}".</Text>
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={[styles.emptyLink, { color: theme.text.accent }]}>Clear search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No connections yet.</Text>
              <Text style={[styles.emptyHint, { color: theme.text.tertiary }]}>
                Use the invite box above to add someone.
              </Text>
            </View>
          )
        }
        renderItem={({ item }: { item: DisplayConnection }) => (
          <ConnectionRow item={item} />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.screen,
    paddingBottom: SPACING.xl,
    gap: SPACING.xs,
  },
  headerTitle: { ...TYPOGRAPHY.heading, color: PALETTE.white },
  headerSub: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.75)' },
  list: { padding: SPACING.screen, gap: SPACING.md, paddingBottom: 100 },

  // Incoming invitation card
  invCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  invCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  invAvatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invName: { ...TYPOGRAPHY.bodyBold },
  invEmail: { ...TYPOGRAPHY.caption, marginTop: 1 },
  invLabel: { ...TYPOGRAPHY.caption },
  invActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  declineBtnText: { ...TYPOGRAPHY.bodyBold },
  acceptBtn: {
    flex: 2,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    minHeight: 38,
    justifyContent: 'center',
  },
  acceptBtnText: { ...TYPOGRAPHY.bodyBold, color: PALETTE.white },

  // Outgoing invite row
  outgoingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  outgoingEmail: { ...TYPOGRAPHY.body },
  outgoingStatus: { ...TYPOGRAPHY.caption, marginTop: 2 },

  // Invite input card
  inviteCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  inviteTitle: { ...TYPOGRAPHY.subheading },
  inviteBody: { ...TYPOGRAPHY.caption },
  inviteRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  inviteInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.body,
  },
  inviteBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, ...TYPOGRAPHY.body },

  // Labels / empty
  sectionLabel: { ...TYPOGRAPHY.label, marginTop: SPACING.xs },
  centeredRow: { paddingVertical: SPACING.xl, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center' },
  emptyHint: { ...TYPOGRAPHY.caption, textAlign: 'center' },
  emptyLink: { ...TYPOGRAPHY.bodyBold },

  // Connection row
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  connectionInfo: { flex: 1 },
  connectionName: { ...TYPOGRAPHY.bodyBold },
  connectionEmail: { ...TYPOGRAPHY.caption, marginTop: 2 },
});
