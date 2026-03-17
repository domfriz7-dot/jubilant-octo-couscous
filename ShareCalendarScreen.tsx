import React, { memo, useCallback, useMemo, useState } from 'react';
import { RefreshControl, SectionList, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUsers } from '../hooks/useUsers';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Avatar from '../ui/components/Avatar';
import EmptyState from '../ui/components/EmptyState';
import LoadingState from '../ui/components/LoadingState';
import SearchBar from '../ui/components/SearchBar';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import PressableScale from '../ui/components/PressableScale';
import { tokens } from '../config/tokens';

const REL_LABELS = { self: 'You', partner: 'Partner', friend: 'Friend', family: 'Family', colleague: 'Colleague', other: '' };
const REL_ICONS = { partner: 'heart', friend: 'smile', family: 'home', colleague: 'briefcase' };
type NavigationLike = { navigate: (screen: string, params?: Record<string, unknown>) => void };

type ConnectionUser = {
  id: string;
  name: string;
  email?: string;
  relationship?: string;
  color?: string;
  avatar?: string | null;
  level?: number;
};


const ConnectionCard = memo(function ConnectionCard({ item, theme, onPress }: { item: { id: string; name: string; color?: string; avatar?: string | null }; theme: Record<string, unknown>; onPress: (item: unknown) => void }) {
  return (
    <PressableScale onPress={() => onPress(item)} style={[s.card, { backgroundColor: theme.bg.card }]}>
      <Avatar name={item.name} color={item.color} size={40} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <AppText variant="label" numberOfLines={1}>{item.name}</AppText>
        <AppText variant="caption" color="secondary">{item.relationship || 'Connected'}</AppText>
      </View>
      <Feather name="chevron-right" size={16} color={theme.text.tertiary} />
    </PressableScale>
  );
});

export default function ConnectionsScreen({ navigation }: { navigation: NavigationLike }) {
  const { theme } = useAppTheme();
  const { others: allOthers, reload } = useUsers();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  const totalOthers = allOthers.length;

  const sections = useMemo(() => {
    const filtered = allOthers
      .filter((u: ConnectionUser) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

    const map: Record<string, ConnectionUser[]> = {};
    filtered.forEach((u: ConnectionUser) => {
      const letter = (u.name || '?').charAt(0).toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(u);
    });
    return Object.keys(map).sort().map((letter) => ({ title: letter, data: map[letter] }));
  }, [allOthers, search]);

  const handleInvite = useCallback(() => {
    haptics.light();
    navigation.navigate('Invite');
  }, [navigation]);

  return (
    <Screen>
      <Header title="Your People" subtitle={`${totalOthers} ${totalOthers === 1 ? 'person' : 'people'} in your circle`} rightAction={{ icon: 'user-plus', label: 'Invite', onPress: handleInvite }} />

      {/* Search */}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search people…"
        style={{ marginHorizontal: tokens.space.lg, marginBottom: tokens.space.md }}
      />

      {sections.length === 0 && totalOthers === 0 ? (
        <EmptyState icon="users" title="Your circle starts here" message="Invite someone you care about to start planning life together." actionTitle="Invite someone" onAction={handleInvite} />
      ) : sections.length === 0 ? (
        <EmptyState icon="search" title="Nobody found" message={`No one matching "${search}" in your circle`} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(u: ConnectionUser) => String(u.id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: tokens.space.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} colors={[theme.accent.primary]} />}
          renderSectionHeader={({ section }) => (
            <AppText variant="caption" color="secondary" style={s.sectionHead}>{section.title}</AppText>
          )}
          renderItem={({ item }) => {
            const rel = REL_LABELS[item.relationship as keyof typeof REL_LABELS] || '';
            const relIcon = REL_ICONS[item.relationship as keyof typeof REL_ICONS];
            return (
              <PressableScale
              accessibilityRole="button" onPress={() => { haptics.light(); navigation.navigate('ConnectionDetail', { user: item }); }} activeOpacity={0.85}
                accessibilityLabel={`${item.name}, ${REL_LABELS[item.relationship as keyof typeof REL_LABELS] || 'Connection'}`}>
                <Card style={s.card}>
                  <Avatar name={item.name} color={item.color} uri={item.avatar} size={48} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="label">{item.name}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
                      {!!rel && rel !== 'You' && (
                        <View style={[s.relBadge, { backgroundColor: theme.accent.light }]}>
                          {relIcon && <Feather name={relIcon} size={12} color={theme.accent.primary} style={{ marginRight: 3 }} />}
                          <AppText variant="tiny" style={{ color: theme.accent.primary, fontWeight: '600' }}>{rel}</AppText>
                        </View>
                      )}
                      <AppText variant="caption" color="secondary">{item.email}</AppText>
                    </View>
                  </View>
                  <View style={{ alignItems: 'center', marginLeft: 8 }}>
                    <AppText variant="caption" color="secondary">Lv {item.level || 1}</AppText>
                    <Feather name="chevron-right" size={16} color={theme.text.tertiary} style={{ marginTop: 2 }} />
                  </View>
                </Card>
              </PressableScale>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListFooterComponent={
            <TouchableOpacity
              accessibilityRole="button" onPress={handleInvite} style={[s.inviteBtn, { borderColor: theme.border }]} activeOpacity={0.8}>
              <Feather name="plus" size={18} color={theme.accent.primary} />
              <AppText variant="label" style={{ color: theme.accent.primary, marginLeft: 8 }}>Invite someone</AppText>
            </TouchableOpacity>
          }
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  sectionHead: { marginTop: tokens.space.md, marginBottom: tokens.space.xs, marginLeft: 4 },
  card: { flexDirection: 'row', alignItems: 'center', padding: tokens.space.base },
  relBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: tokens.space.lg, paddingVertical: 14, borderRadius: tokens.radius.lg, borderWidth: 1.5, borderStyle: 'dashed' },
});
