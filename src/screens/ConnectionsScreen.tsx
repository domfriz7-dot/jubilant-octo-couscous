import React, { useState } from 'react';
import {
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
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE, EVENT_COLORS } from '../ui/theme/tokens';

interface Connection {
  id: string;
  name: string;
  email: string;
  color: string;
  status: 'active' | 'pending';
}

// Demo data — in production this comes from the backend
const DEMO_CONNECTIONS: Connection[] = [
  { id: 'u1', name: 'Jordan', email: 'jordan@example.com', color: EVENT_COLORS[0], status: 'active' },
  { id: 'u2', name: 'Sam', email: 'sam@example.com', color: EVENT_COLORS[2], status: 'active' },
  { id: 'u3', name: 'Riley', email: 'riley@example.com', color: EVENT_COLORS[4], status: 'pending' },
];

function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  const initials = name.trim().charAt(0).toUpperCase();
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ ...TYPOGRAPHY.bodyBold, color: PALETTE.white, fontSize: size * 0.4 }}>{initials}</Text>
    </View>
  );
}

export default function ConnectionsScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const filtered = DEMO_CONNECTIONS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      {/* Header */}
      <LinearGradient
        colors={theme.gradient.primary}
        style={[styles.header, { paddingTop: top + SPACING.lg }]}
      >
        <Text style={styles.headerTitle}>People</Text>
        <Text style={styles.headerSub}>
          {DEMO_CONNECTIONS.filter((c) => c.status === 'active').length} connections
        </Text>
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
                />
                <TouchableOpacity
                  style={[styles.inviteBtn, { backgroundColor: theme.primary, opacity: inviteEmail.trim() ? 1 : 0.4 }]}
                  disabled={!inviteEmail.trim()}
                >
                  <Ionicons name="send" size={18} color={PALETTE.white} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Your connections</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No connections found.</Text>
        }
        renderItem={({ item }) => (
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
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center', paddingVertical: SPACING.xl },
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
