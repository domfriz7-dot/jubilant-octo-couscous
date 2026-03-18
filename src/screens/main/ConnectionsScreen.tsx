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
import { getConnections, Connection } from '../../services/ConnectionsService';

function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  const initials = name.trim().charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ ...TYPOGRAPHY.bodyBold, color: PALETTE.white, fontSize: size * 0.4 }}>{initials}</Text>
    </View>
  );
}

export default function ConnectionsScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const connections = getConnections();

  const filtered = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = connections.filter((c) => c.status === 'active').length;

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setInviting(true);
    try {
      // In production: call backend API to send invite
      await new Promise<void>((resolve) => setTimeout(resolve, 800));
      setInviteEmail('');
      Alert.alert('Invite sent!', `An invitation has been sent to ${email}.`);
    } catch {
      Alert.alert('Error', 'Could not send invite. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      {/* Header */}
      <LinearGradient
        colors={theme.gradient.primary}
        style={[styles.header, { paddingTop: top + SPACING.lg }]}
      >
        <Text style={styles.headerTitle}>People</Text>
        <Text style={styles.headerSub}>{activeCount} {activeCount === 1 ? 'connection' : 'connections'}</Text>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Search */}
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

            {/* Invite card */}
            <View style={[styles.inviteCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}>
              <Text style={[styles.inviteTitle, { color: theme.text.primary }]}>Invite someone</Text>
              <Text style={[styles.inviteBody, { color: theme.text.secondary }]}>
                Share your calendar with a friend or partner.
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

            <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Your connections</Text>
          </>
        }
        ListEmptyComponent={
          search.length > 0 ? (
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
        renderItem={({ item }: { item: Connection }) => (
          <View style={[styles.connectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
            <Avatar name={item.name} color={item.color} />
            <View style={styles.connectionInfo}>
              <Text style={[styles.connectionName, { color: theme.text.primary }]}>{item.name}</Text>
              <Text style={[styles.connectionEmail, { color: theme.text.secondary }]}>{item.email}</Text>
            </View>
            {item.status === 'pending' ? (
              <View style={[styles.pendingBadge, { backgroundColor: `${theme.warning}22`, borderColor: theme.warning }]}>
                <Text style={[styles.pendingText, { color: theme.warning }]}>Pending</Text>
              </View>
            ) : (
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            )}
          </View>
        )}
      />
    </View>
  );
}

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
  sectionLabel: { ...TYPOGRAPHY.label, marginTop: SPACING.xs },
  emptyWrap: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center' },
  emptyHint: { ...TYPOGRAPHY.caption, textAlign: 'center' },
  emptyLink: { ...TYPOGRAPHY.bodyBold },
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
  pendingBadge: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  pendingText: { ...TYPOGRAPHY.label },
});
