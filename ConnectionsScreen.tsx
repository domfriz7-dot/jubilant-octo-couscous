import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import SmartList from '../ui/components/SmartList';
import { Feather } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';

import type { RootStackParamList } from '../navigation/types';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import AppText from '../ui/components/AppText';
import Input from '../ui/components/Input';
import Card from '../ui/components/Card';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import { generate } from '../services/DateIdeasService';
import type { BudgetTier } from '../services/DateIdeasService';

// ─── Constants ────────────────────────────────────────────
const VIBES = [
  { id: 'romantic', label: 'Romantic', icon: 'heart' },
  { id: 'cozy', label: 'Cozy', icon: 'coffee' },
  { id: 'playful', label: 'Playful', icon: 'smile' },
  { id: 'thoughtful', label: 'Thoughtful', icon: 'book' },
  { id: 'adventurous', label: 'Adventure', icon: 'compass' },
];

const BUDGETS = [
  { id: 'low', label: '$', desc: 'Free / cheap' },
  { id: 'mid', label: '$$', desc: 'Moderate' },
  { id: 'high', label: '$$$', desc: 'Splurge' },
];

const CATEGORIES = [
  { id: 'food', label: 'Food', icon: 'coffee' },
  { id: 'outdoors', label: 'Outdoors', icon: 'sun' },
  { id: 'creative', label: 'Creative', icon: 'edit-3' },
  { id: 'games', label: 'Games', icon: 'play' },
  { id: 'culture', label: 'Culture', icon: 'image' },
  { id: 'wellness', label: 'Wellness', icon: 'heart' },
  { id: 'adventure', label: 'Adventure', icon: 'map' },
  { id: 'at-home', label: 'At home', icon: 'home' },
];

const EMOJI_MAP: Record<string, string> = {
  food: '🍜', outdoors: '🌿', creative: '🎨', games: '🎲',
  culture: '🎭', wellness: '🧘', adventure: '🗺️', 'at-home': '🏠',
  seasonal: '🎄', dessert: '🍰', nightlife: '🌃', explore: '🔍',
};

function pickEmoji(category: string): string {
  return EMOJI_MAP[(category || '').toLowerCase()] || '✨';
}

function fmtDuration(mins: number): string {
  if (!mins) return '~1.5h';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function normTitle(t: string): string {
  return (t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── Filter Chip ──────────────────────────────────────────
function FilterChip({ active, icon, label, onPress, theme }: { active: boolean; icon: string; label: string; onPress: () => void; theme: Record<string, unknown> }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        st.chip,
        {
          backgroundColor: active ? theme.accent.primary : 'transparent',
          borderColor: active ? theme.accent.primary : theme.divider,
        },
      ]}
    >
      {icon ? <Feather name={icon} size={12} color={active ? theme.text.inverse : theme.text.secondary} /> : null}
      <AppText
        variant="caption"
        style={{
          marginLeft: icon ? 5 : 0,
          color: active ? theme.text.inverse : theme.text.secondary,
          fontWeight: active ? '700' : '500',
        }}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

// ─── Idea Card ────────────────────────────────────────────
function IdeaCard({ idea, theme, onSchedule, expanded, onToggle }: { idea: Record<string, unknown>; theme: Record<string, unknown>; onSchedule: (i: Record<string, unknown>) => void; expanded: boolean; onToggle: () => void }) {
  const emoji = pickEmoji(idea.category);

  return (
    <Card style={st.ideaCard}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${idea.title}. ${idea.vibe}, ${idea.category}, ${fmtDuration(idea.durationMins)}`}
      >
        {/* Header row */}
        <View style={st.ideaHeader}>
          <View style={[st.ideaEmoji, { backgroundColor: theme.accent.primary + '12' }]}>
            <AppText style={{ fontSize: 22 }}>{emoji}</AppText>
          </View>
          <View style={st.flex1}>
            <AppText variant="label" style={{ fontSize: 15, lineHeight: 20 }} numberOfLines={2}>{idea.title}</AppText>
            <View style={st.ideaMeta}>
              <View style={[st.metaPill, { backgroundColor: theme.bg.subtle }]}>
                <AppText style={{ fontSize: 10, color: theme.text.tertiary }}>{idea.vibe}</AppText>
              </View>
              <View style={[st.metaPill, { backgroundColor: theme.bg.subtle }]}>
                <AppText style={{ fontSize: 10, color: theme.text.tertiary }}>{idea.category}</AppText>
              </View>
              <View style={[st.metaPill, { backgroundColor: theme.bg.subtle }]}>
                <Feather name="clock" size={9} color={theme.text.tertiary} style={{ marginRight: 3 }} />
                <AppText style={{ fontSize: 10, color: theme.text.tertiary }}>{fmtDuration(idea.durationMins)}</AppText>
              </View>
            </View>
          </View>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.text.tertiary} />
        </View>

        {/* Preview detail — always visible */}
        {idea.details && !expanded ? (
          <AppText variant="caption" color="tertiary" numberOfLines={1} style={{ marginTop: 6 }}>
            {idea.details}
          </AppText>
        ) : null}
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={[st.ideaExpanded, { borderTopColor: theme.divider }]}>
          {idea.details ? (
            <AppText variant="bodySm" color="secondary" style={{ marginBottom: 10, lineHeight: 20 }}>{idea.details}</AppText>
          ) : null}

          {idea.why ? (
            <View style={[st.whyBox, { backgroundColor: theme.accent.primary + '08' }]}>
              <Feather name="star" size={12} color={theme.accent.primary} />
              <AppText variant="caption" style={{ color: theme.accent.primary, marginLeft: 6, flex: 1, lineHeight: 16 }}>{idea.why}</AppText>
            </View>
          ) : null}

          {idea.firstSteps?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <AppText variant="caption" color="tertiary" style={{ marginBottom: 6, fontWeight: '600' }}>Quick start</AppText>
              {idea.firstSteps.slice(0, 3).map((step: string, i: number) => (
                <View key={i} style={st.stepRow}>
                  <View style={[st.stepNum, { backgroundColor: theme.accent.primary + '15' }]}>
                    <AppText style={{ fontSize: 10, fontWeight: '700', color: theme.accent.primary }}>{i + 1}</AppText>
                  </View>
                  <AppText variant="caption" color="secondary" style={{ flex: 1, marginLeft: 8 }}>{step}</AppText>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={onSchedule}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[st.scheduleBtn, { backgroundColor: theme.accent.primary }]}
          >
            <Feather name="calendar" size={14} color="#FFF" />
            <AppText style={{ color: '#FFF', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>Schedule this date</AppText>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

const MemoIdeaCard = React.memo(IdeaCard);
MemoIdeaCard.displayName = 'IdeaCard';

// ─── Screen ───────────────────────────────────────────────
type Props = StackScreenProps<RootStackParamList, 'DateGenerator'>;

export default function DateGeneratorScreen({ navigation, route }: Props) {
  const { theme } = useAppTheme();
  const [vibe, setVibe] = useState('romantic');
  const [budget, setBudget] = useState<BudgetTier>('mid');
  const [category, setCategory] = useState<string>('');
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const time = (route?.params as Record<string, unknown>)?.time || 'tonight';

  // Generate + deduplicate
  const ideas = useMemo(() => {
    const raw = generate({ vibe, budget, time, count: 48, seed: Date.now() + refreshKey });
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();

    return raw.filter((i: { tags?: string[]; mood?: string; indoor?: boolean }) => {
      // Deduplicate aggressively by normalised title
      const norm = normTitle(i.title);
      if (seen.has(norm)) return false;
      seen.add(norm);

      // Category filter
      if (category && (i.category || '').toLowerCase() !== category) return false;

      // Search filter
      if (q) {
        const hay = `${i.title || ''} ${i.details || ''} ${i.category || ''} ${i.vibe || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    }).slice(0, 14);
  }, [vibe, budget, refreshKey, time, category, query]);

  const refresh = useCallback(() => {
    haptics.light();
    setRefreshKey((k) => k + 1);
    setExpandedId(null);
  }, []);

  const surprise = useCallback(() => {
    haptics.medium();
    const vibes = ['romantic', 'cozy', 'playful', 'thoughtful', 'adventurous'];
    const budgets = ['low', 'mid', 'high'];
    setVibe(vibes[Math.floor(Math.random() * vibes.length)]);
    setBudget(budgets[Math.floor(Math.random() * budgets.length)] as BudgetTier);
    setCategory('');
    setQuery('');
    setRefreshKey((k) => k + 1);
    setExpandedId(null);
  }, []);

  const scheduleIdea = useCallback((idea: Record<string, unknown>) => {
    haptics.success();
    navigation.navigate('AutoSchedule', { preset: { durationMins: idea.durationMins }, idea });
  }, [navigation]);

  const renderIdeaItem = useCallback(({ item, index }: { item: Record<string, unknown>; index: number }) => {
    const key = `${normTitle(item.title)}_${index}`;
    const onToggle = () => {
      setExpandedId((prev: unknown) => (prev === key ? null : key));
      haptics.light();
    };
    const onSchedule = () => scheduleIdea(item);
    return (
      <MemoIdeaCard
        idea={item}
        theme={theme}
        expanded={expandedId === key}
        onToggle={onToggle}
        onSchedule={onSchedule}
      />
    );
  }, [expandedId, scheduleIdea, theme]);

  // ─── Render ─────────────────────────────────────────────
  return (
    <Screen>
      <Header
        title="Date Ideas"
        subtitle={`${ideas.length} suggestions`}
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
      />

      <SmartList
        data={ideas}
        keyExtractor={(item, idx) => `${normTitle(item.title)}_${idx}`}
        estimatedItemSize={140}
        contentContainerStyle={st.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={st.filterArea}>
            {/* Search */}
            <Input
              placeholder="Search (e.g. ramen, sunset, museum)"
              value={query}
              onChangeText={setQuery}
              style={{ marginBottom: tokens.space.sm }}
            />

            {/* Vibe + Budget inline */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterScroll}>
              {VIBES.map((v) => (
                <FilterChip
                  key={v.id}
                  active={vibe === v.id}
                  icon={v.icon}
                  label={v.label}
                  theme={theme}
                  onPress={() => { setVibe(v.id); haptics.light(); }}
                />
              ))}
              <View style={st.filterDivider} />
              {BUDGETS.map((b) => (
                <FilterChip
                  key={b.id}
                  active={budget === b.id}
                  label={b.label}
                  theme={theme}
                  onPress={() => { setBudget(b.id as BudgetTier); haptics.light(); }}
                />
              ))}
            </ScrollView>

            {/* Category pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[st.filterScroll, { marginTop: 6 }]}>
              <FilterChip active={!category} icon="grid" label="All" theme={theme} onPress={() => { setCategory(''); haptics.light(); }} />
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c.id}
                  active={category === c.id}
                  icon={c.icon}
                  label={c.label}
                  theme={theme}
                  onPress={() => { setCategory(c.id); haptics.light(); }}
                />
              ))}
            </ScrollView>

            {/* Actions row */}
            <View style={st.actionsRow}>
              <TouchableOpacity onPress={refresh} activeOpacity={0.8} accessibilityRole="button" style={[st.actionBtn, { borderColor: theme.divider }]}>
                <Feather name="refresh-cw" size={12} color={theme.accent.primary} />
                <AppText variant="caption" style={{ color: theme.accent.primary, marginLeft: 5, fontWeight: '600' }}>Refresh</AppText>
              </TouchableOpacity>

              <TouchableOpacity onPress={surprise} activeOpacity={0.8} accessibilityRole="button" style={[st.actionBtn, { borderColor: theme.divider }]}>
                <Feather name="shuffle" size={12} color={theme.accent.primary} />
                <AppText variant="caption" style={{ color: theme.accent.primary, marginLeft: 5, fontWeight: '600' }}>Surprise me</AppText>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={st.emptyState}>
            <View style={[st.emptyIcon, { backgroundColor: theme.bg.subtle }]}>
              <Feather name="search" size={24} color={theme.text.tertiary} />
            </View>
            <AppText variant="label" style={{ marginTop: 12 }}>No matches</AppText>
            <AppText variant="bodySm" color="secondary" style={{ marginTop: 4, textAlign: 'center' }}>
              Try different filters or tap Refresh.
            </AppText>
          </View>
        }
        renderItem={renderIdeaItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────
const st = StyleSheet.create({
  list: { paddingHorizontal: tokens.space.lg, paddingBottom: 140 },

  // Filters
  filterArea: { marginBottom: tokens.space.md },
  filterScroll: { gap: 8, paddingVertical: tokens.space.xs },
  filterDivider: { width: 1, height: 20, backgroundColor: 'rgba(150,150,150,0.2)', marginHorizontal: 4, alignSelf: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: tokens.radius.pill, borderWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row', gap: 10,
    marginTop: tokens.space.sm, paddingTop: tokens.space.xs,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: tokens.radius.pill, borderWidth: 1,
  },

  // Card
  ideaCard: { padding: tokens.space.base, overflow: 'hidden' },
  ideaHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ideaEmoji: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ideaMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  metaPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },

  // Expanded
  ideaExpanded: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  whyBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: tokens.radius.sm, marginBottom: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  stepNum: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scheduleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: tokens.radius.md, marginTop: 14,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

  flex1: { flex: 1 },
});
