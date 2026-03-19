import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AppText from '../../ui/components/AppText';
import { tokens } from '../../config/tokens';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props {
  insets: { top: number; bottom: number; left: number; right: number };
  theme: Record<string, unknown>;
  searchVisible: boolean;
  onToggleSearch: () => void;
  viewMode: 'month' | 'week' | string;
  onToggleView: () => void;
  sharedOnly?: boolean;
  onToggleShared?: () => void;
}

function CalendarHeader({ insets, theme, searchVisible, onToggleSearch, viewMode, onToggleView, sharedOnly, onToggleShared }: Props) {
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <AppText variant="heading" style={{ flex: 1 }} accessibilityRole="header">Calendar</AppText>
      {onToggleShared && (
        <TouchableOpacity onPress={onToggleShared} hitSlop={HIT}
          accessibilityLabel={sharedOnly ? 'Show all events' : 'Show shared events only'}
          accessibilityRole="button"
          activeOpacity={0.8}
          style={[s.btn, { backgroundColor: sharedOnly ? theme.accent.primary : theme.bg.subtle, marginRight: 8 }]}>
          <Feather name="users" size={18} color={sharedOnly ? theme.text.inverse : theme.text.secondary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onToggleSearch} hitSlop={HIT}
        accessibilityLabel={searchVisible ? 'Close search' : 'Search events'}
        accessibilityRole="button"
        activeOpacity={0.8}
        style={[s.btn, { backgroundColor: searchVisible ? theme.accent.primary : theme.bg.subtle }]}>
        <Feather name="search" size={18} color={searchVisible ? theme.text.inverse : theme.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggleView} hitSlop={HIT}
        accessibilityLabel={viewMode === 'month' ? 'Switch to week view' : 'Switch to month view'}
        accessibilityRole="button"
        activeOpacity={0.8}
        style={[s.btn, { backgroundColor: theme.bg.subtle, marginLeft: 8 }]}>
        <Feather name={viewMode === 'month' ? 'columns' : 'grid'} size={18} color={theme.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(CalendarHeader);

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
  btn: { width: 44, height: 44, borderRadius: tokens.radius.md, alignItems: 'center', justifyContent: 'center' },
});
