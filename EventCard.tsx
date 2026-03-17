import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import AppText from '../../ui/components/AppText';
import Avatar from '../../ui/components/Avatar';
import SearchBar from '../../ui/components/SearchBar';
import WrapRow from '../../ui/components/WrapRow';
import { tokens } from '../../config/tokens';
import { getFirstName } from '../../utils/partners';

const HIT = { top: 6, bottom: 6, left: 6, right: 6 };
const FILTER_COLORS = tokens.tagsArray.slice(0, 6);

interface Props {
  theme: Record<string, unknown>;
  others: Array<{ id: string; name: string; color?: string }>;
  query: string;
  onQueryChange: (q: string) => void;
  filterPerson: string | null;
  onFilterPerson: (id: string | null) => void;
  filterColor: string | null;
  onFilterColor: (color: string | null) => void;
  onClear: () => void;
  hasFilters: boolean;
  haptics: { light: () => void };
}

function FiltersRow({ theme, others, query, onQueryChange, filterPerson, onFilterPerson, filterColor, onFilterColor, onClear, hasFilters, haptics }: Props) {
  return (
    <View style={s.wrap}>
      <SearchBar
        value={query}
        onChangeText={onQueryChange}
        placeholder="Search events…"
        style={{ marginBottom: 6 }}
      />
      <WrapRow spacing={8} style={s.row}>
        <AppText variant="caption" color="tertiary" style={{ marginRight: 6 }}>Person:</AppText>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8} onPress={() => onFilterPerson(null)} style={[s.chip, !filterPerson && { backgroundColor: theme.accent.light }]}
          accessibilityLabel="Show all people" accessibilityState={{ selected: !filterPerson }}>
          <AppText variant="caption" style={{ color: !filterPerson ? theme.accent.primary : theme.text.secondary }}>All</AppText>
        </TouchableOpacity>
        {others.map((u: { id: string; name: string; color?: string }) => (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8} key={u.id} onPress={() => { haptics.light(); onFilterPerson(filterPerson === u.id ? null : u.id); }}
            style={[s.chip, filterPerson === u.id && { backgroundColor: theme.accent.light }]}
            accessibilityLabel={`Filter by ${u.name}`} accessibilityState={{ selected: filterPerson === u.id }}>
            <Avatar name={u.name} color={u.color} size={16} />
            <AppText variant="caption" style={{ marginLeft: 4, color: filterPerson === u.id ? theme.accent.primary : theme.text.secondary }}>{getFirstName(u.name)}</AppText>
          </TouchableOpacity>
        ))}
      </WrapRow>
      <WrapRow spacing={8} style={[s.row, { marginTop: 4 }]}>
        <AppText variant="caption" color="tertiary" style={{ marginRight: 6 }}>Color:</AppText>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8} onPress={() => onFilterColor(null)} style={[s.chip, !filterColor && { backgroundColor: theme.accent.light }]}
          accessibilityLabel="Show all colors" accessibilityState={{ selected: !filterColor }}>
          <AppText variant="caption" style={{ color: !filterColor ? theme.accent.primary : theme.text.secondary }}>All</AppText>
        </TouchableOpacity>
        {FILTER_COLORS.map((c: string) => (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8} key={c} onPress={() => { haptics.light(); onFilterColor(filterColor === c ? null : c); }}
            style={[s.colorChip, filterColor === c && { borderWidth: 2, borderColor: theme.text.primary }]}
            accessibilityLabel={`Filter by color`} accessibilityState={{ selected: filterColor === c }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c }} />
          </TouchableOpacity>
        ))}
      </WrapRow>
      {hasFilters && (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8} onPress={onClear} style={{ marginTop: 6 }} hitSlop={HIT} accessibilityLabel="Clear all filters">
          <AppText variant="caption" style={{ color: theme.accent.primary }}>Clear filters</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default React.memo(FiltersRow);

const s = StyleSheet.create({
  wrap: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 32, borderRadius: 8 },
  colorChip: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
