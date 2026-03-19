import React, { useCallback, useState, useEffect } from 'react';
import {  StyleSheet, View, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../ui/components/Screen';
import SmartList from '../ui/components/SmartList';
import Header from '../ui/components/Header';
import LoadingState from '../ui/components/LoadingState';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Button from '../ui/components/Button';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import CalendarImportService from '../services/CalendarImportService';
import { addDays } from '../utils/dateTime';
import { logError } from '../services/logger';
import type { NativeCalendarRef, RootStackParamList } from '../navigation/types';

type CalendarOption = NativeCalendarRef & {
  color?: string;
  type?: string;
  source?: string;
  isPrimary?: boolean;
  isWork?: boolean;
  isPersonal?: boolean;
};

type CalendarItemProps = { calendar: CalendarOption; selected: boolean; onToggle: (id: string) => void; theme: ReturnType<typeof useAppTheme>['theme'] };

function CalendarItem({ calendar, selected, onToggle, theme }: CalendarItemProps) {
  const sourceIcons: Record<string, string> = {
    'local': 'smartphone',
    'caldav': 'cloud',
    'exchange': 'briefcase',
    'com.apple.mobileme': 'cloud',
  };

  const icon = sourceIcons[String(calendar?.type)] || 'calendar';
  
  return (
    <TouchableOpacity
              accessibilityRole="button"
      onPress={() => {
        haptics.light();
        onToggle(calendar.id);
      }}
      style={[st.calendarItem, { backgroundColor: theme.bg.card, borderColor: theme.divider }]}
      activeOpacity={0.7}
    >
      <View style={[st.calendarColor, { backgroundColor: calendar.color || theme.accent.primary }]} />
      
      <View style={st.flex1ml12}>
        <View style={st.rowCenter}>
          <Feather name={icon} size={14} color={theme.text.tertiary} />
          <AppText style={[st.calendarTitle, { color: theme.text.primary, marginLeft: 6 }]}>
            {calendar.title}
          </AppText>
        </View>
        
        <AppText style={[st.calendarSource, { color: theme.text.secondary }]}>
          {calendar.source}
          {calendar.isPrimary && ' • Primary'}
          {calendar.isWork && ' • Work'}
          {calendar.isPersonal && ' • Personal'}
        </AppText>
      </View>

      <Switch
        value={selected}
        onValueChange={() => {
          haptics.light();
          onToggle(calendar.id);
        }}
        trackColor={{ false: theme.bg.muted, true: theme.accent.primary + '80' }}
        thumbColor={selected ? theme.accent.primary : theme.bg.surface}
      />
    </TouchableOpacity>
  );
}

type DateRangeSelectorProps = { value: number; onChange: (days: number) => void; theme: ReturnType<typeof useAppTheme>['theme'] };

function DateRangeSelector({ value, onChange, theme }: DateRangeSelectorProps) {
  const options = [
    { days: 30, label: 'Next month' },
    { days: 90, label: 'Next 3 months' },
    { days: 180, label: 'Next 6 months' },
    { days: 365, label: 'Next year' },
  ];

  return (
    <View style={st.dateRangeRow}>
      {options.map((opt) => (
        <TouchableOpacity
              accessibilityRole="button"
          key={opt.days}
          onPress={() => {
            haptics.light();
            onChange(opt.days);
          }}
          style={[
            st.dateRangeChip,
            {
              backgroundColor: value === opt.days ? theme.accent.primary : theme.bg.muted,
              borderColor: value === opt.days ? theme.accent.primary : theme.divider,
            },
          ]}
          activeOpacity={0.7}
        >
          <AppText
            style={{
              fontSize: tokens.type.size.sm,
              fontWeight: '600',
              color: value === opt.days ? theme.text.inverse : theme.text.secondary,
            }}
          >
            {opt.label}
          </AppText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

type CalendarImportSetupRouteParams = RootStackParamList['CalendarImportSetup'];

export default function CalendarImportSetupScreen({ navigation, route }: { navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void }; route: { params?: CalendarImportSetupRouteParams } }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { calendars: routeCalendars } = route.params || {};
  
  const [calendars, setCalendars] = useState<CalendarOption[]>(routeCalendars || []);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!routeCalendars);
  const [importing, setImporting] = useState(false);
  
  // Settings
  const [importRange, setImportRange] = useState(90);
  const [onlyShared, setOnlyShared] = useState(false);
  const [detectPartner, setDetectPartner] = useState(true);

  useEffect(() => {
    if (!routeCalendars) {
      loadCalendars();
    }
  }, []);

  const loadCalendars = async () => {
    try {
      setLoading(true);

      // Ensure we have permissions before attempting to query calendars.
      const perm = await CalendarImportService.requestCalendarPermissions();
      if (!perm.granted) {
        // eslint-disable-next-line no-alert
        alert('Calendar access is required to import events. Please enable it in Settings and try again.');
        navigation.goBack();
        return;
      }

      const cals = await CalendarImportService.getDeviceCalendars();
      setCalendars(cals);
      
      // Auto-select personal calendars
      const personalIds = cals.filter((c: CalendarOption) => c.isPersonal || c.isPrimary).map((c: CalendarOption) => c.id);
      setSelectedIds(personalIds);
    } catch (error) {
      logError('Error loading calendars:', error);
      // eslint-disable-next-line no-alert
      alert(`Failed to load calendars: ${String((error as Error)?.message || error)}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleCalendar = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleImport = async () => {
    if (selectedIds.length === 0) {
      haptics.error();
      // eslint-disable-next-line no-alert
      alert('Please select at least one calendar to import from.');
      return;
    }

    try {
      setImporting(true);
      haptics.medium();

      const result = await CalendarImportService.importAndAddEvents({
        calendarIds: selectedIds,
        startDate: new Date(),
        endDate: addDays(new Date(), importRange),
        detectPartner,
        excludeKeywords: ['meeting', 'standup', 'sync'],
        onlyShared,
      });

      if (result.success) {
        haptics.success();
        navigation.navigate('CalendarImportSuccess', {
          imported: result.imported,
          // importAndAddEvents currently returns only { imported }.
          // Keep success screen happy with sane fallbacks.
          added: result.imported,
          total: result.imported,
        });
      } else {
        haptics.error();
        alert(`Import failed: ${result.error}`);
      }
    } catch (error: unknown) {
      haptics.error();
      // eslint-disable-next-line no-alert
      alert(`Import error: ${String((error instanceof Error ? error.message : error) || 'Unknown error')}`);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header
          title="Import Calendar"
          leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <AppText style={{ marginTop: 16, color: theme.text.secondary }}>
            Loading calendars...
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Import Calendar"
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
      />

      <SmartList
          estimatedItemSize={64}
        data={calendars}
        keyExtractor={(it: CalendarOption, idx: number) => String(it?.id ?? idx)}
        contentContainerStyle={{ padding: tokens.space.lg, paddingBottom: Math.max(insets.bottom, 24) + 180 }}
                renderItem={({ item: calendar }) => (
          <CalendarItem
            calendar={calendar}
            selected={selectedIds.includes(calendar.id)}
            onToggle={toggleCalendar}
            theme={theme}
          />
        )}
        ListHeaderComponent={() => (
          <>
            {/* Info Card */}
        <Card style={{ backgroundColor: theme.accent.light, marginBottom: tokens.space.lg }}>
          <View style={st.row}>
            <Feather name="info" size={20} color={theme.accent.primary} style={st.mt2} />
            <View style={st.flex1ml12}>
              <AppText style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>
                Import Your Existing Events
              </AppText>
              <AppText style={{ fontSize: tokens.type.size.sm, color: theme.text.secondary, marginTop: 4, lineHeight: 18 }}>
                Select which calendars to import from. We'll copy events to U&Me without modifying your original calendars.
              </AppText>
            </View>
          </View>
        </Card>

        {/* Date Range */}
        <AppText style={[st.sectionTitle, { color: theme.text.primary }]}>
          How far ahead?
        </AppText>
        <DateRangeSelector value={importRange} onChange={setImportRange} theme={theme} />

        {/* Calendar Selection */}
        <AppText style={[st.sectionTitle, { color: theme.text.primary, marginTop: tokens.space.xl }]}>
          Select Calendars ({selectedIds.length} of {calendars.length})
        </AppText>
          </>
        )}
                ListEmptyComponent={() => (
          <Card>
    <AppText style={{ textAlign: 'center', color: theme.text.secondary }}>
      No calendars found on your device
            </AppText>
          </Card>
        )}
        ListFooterComponent={() => (
          <>
    {/* Options */}
    <AppText style={[st.sectionTitle, { color: theme.text.primary, marginTop: tokens.space.xl }]}>
      Import Options
    </AppText>


        <Card>
          <View style={st.optionRow}>
            <View style={st.flex1}>
              <AppText style={{ fontSize: tokens.type.size.md, fontWeight: '600', color: theme.text.primary }}>
                Only events with attendees
              </AppText>
              <AppText style={{ fontSize: tokens.type.size.sm, color: theme.text.secondary, marginTop: 2 }}>
                Skip solo events like personal reminders
              </AppText>
            </View>
            <Switch
              value={onlyShared}
              onValueChange={setOnlyShared}
              trackColor={{ false: theme.bg.muted, true: theme.accent.primary + '80' }}
              thumbColor={onlyShared ? theme.accent.primary : theme.bg.surface}
            />
          </View>

          <View style={[st.optionRow, { marginTop: tokens.space.md, paddingTop: tokens.space.md, borderTopWidth: 1, borderTopColor: theme.divider }]}>
            <View style={st.flex1}>
              <AppText style={{ fontSize: tokens.type.size.md, fontWeight: '600', color: theme.text.primary }}>
                Detect partner from attendees
              </AppText>
              <AppText style={{ fontSize: tokens.type.size.sm, color: theme.text.secondary, marginTop: 2 }}>
                Auto-share events with 2 attendees
              </AppText>
            </View>
            <Switch
              value={detectPartner}
              onValueChange={setDetectPartner}
              trackColor={{ false: theme.bg.muted, true: theme.accent.primary + '80' }}
              thumbColor={detectPartner ? theme.accent.primary : theme.bg.surface}
            />
          </View>
        </Card>

        {/* Preview */}
        {selectedIds.length > 0 && (
          <Card style={{ marginTop: tokens.space.lg, backgroundColor: theme.bg.muted }}>
            <AppText style={{ fontSize: tokens.type.size.sm, color: theme.text.secondary, textAlign: 'center' }}>
              Ready to import from {selectedIds.length} calendar{selectedIds.length === 1 ? '' : 's'}
            </AppText>
          </Card>
        )}
          </>
        )}
      />

      {/* Fixed Bottom Button */}
      <View
        style={[
          st.bottomBar,
          {
            backgroundColor: theme.bg.surface,
            borderTopColor: theme.divider,
            shadowColor: '#000',
            shadowOpacity: 0.1,
          },
        ]}
      >
        <Button
          title={importing ? 'Importing...' : `Import Events`}
          onPress={handleImport}
          disabled={selectedIds.length === 0 || importing}
          loading={importing}
        />
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  sectionTitle: {
    fontSize: tokens.type.size.lg,
    fontWeight: '800',
    marginBottom: tokens.space.md,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    marginBottom: tokens.space.sm,
  },
  calendarColor: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  calendarTitle: {
    fontSize: tokens.type.size.md,
    fontWeight: '600',
  },
  calendarSource: {
    fontSize: tokens.type.size.xs,
    marginTop: 2,
  },
  dateRangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  dateRangeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    borderWidth: 1.5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: tokens.space.lg,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  flex1: { flex: 1 },
  flex1ml12: { flex: 1, marginLeft: 12 },
  mt2: { marginTop: 2 },
  row: { flexDirection: 'row' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
});
