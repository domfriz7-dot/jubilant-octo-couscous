import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, DateData } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE } from '../../ui/theme/tokens';
import CalendarService, { CalendarEvent } from '../../services/CalendarService';

type Nav = StackNavigationProp<RootStackParamList>;

type MarkedDates = Record<string, { dots: { color: string }[]; selected?: boolean; selectedColor?: string }>;

function buildMarked(events: CalendarEvent[], selected: string): MarkedDates {
  const result: MarkedDates = {};
  for (const e of events) {
    if (!result[e.date]) result[e.date] = { dots: [] };
    if (result[e.date].dots.length < 3) result[e.date].dots.push({ color: e.color });
  }
  result[selected] = { ...(result[selected] ?? { dots: [] }), selected: true, selectedColor: PALETTE.indigo600 };
  return result;
}

export default function CalendarScreen(): JSX.Element {
  const { theme, isDark } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const today = new Date().toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState(today);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    setAllEvents(CalendarService.getEvents());
    const unsub = CalendarService.subscribe(setAllEvents);
    return unsub;
  }, []);

  const dayEvents = allEvents.filter((e) => e.date === selectedDate);
  const markedDates = buildMarked(allEvents, selectedDate);

  const openEvent = useCallback(
    (id: string) => nav.navigate('EventDetails', { eventId: id }),
    [nav]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      {/* Screen header */}
      <LinearGradient
        colors={theme.gradient.primary}
        style={[styles.screenHeader, { paddingTop: top + SPACING.lg }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.screenTitle}>Calendar</Text>
        <TouchableOpacity
          onPress={() => nav.navigate('AddEvent', { selectedDate })}
          style={styles.addBtn}
          accessibilityLabel="Add event"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={26} color={PALETTE.white} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={dayEvents}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Calendar
              current={selectedDate}
              onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
              markingType="multi-dot"
              markedDates={markedDates}
              theme={{
                backgroundColor: theme.bg.default,
                calendarBackground: theme.bg.default,
                textSectionTitleColor: theme.text.secondary,
                selectedDayBackgroundColor: theme.primary,
                selectedDayTextColor: PALETTE.white,
                todayTextColor: theme.primary,
                dayTextColor: theme.text.primary,
                textDisabledColor: theme.text.tertiary,
                dotColor: theme.primary,
                arrowColor: theme.primary,
                monthTextColor: theme.text.primary,
                indicatorColor: theme.primary,
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
              }}
              style={styles.calendar}
            />
            <View style={styles.dayHeader}>
              <Text style={[styles.dayTitle, { color: theme.text.primary }]}>
                {selectedDate === today ? 'Today' : selectedDate}
              </Text>
              <Text style={[styles.dayCount, { color: theme.text.secondary }]}>
                {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyRow}>
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              Nothing scheduled. Tap + to add.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.eventCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}
            onPress={() => openEvent(item.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.colorBar, { backgroundColor: item.color }]} />
            <View style={styles.eventInfo}>
              <Text style={[styles.eventTitle, { color: theme.text.primary }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.eventMeta, { color: theme.text.secondary }]}>
                {item.time}{item.endTime ? ` – ${item.endTime}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.text.tertiary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screen,
    paddingBottom: SPACING.lg,
  },
  screenTitle: { ...TYPOGRAPHY.heading, color: PALETTE.white },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendar: { marginBottom: SPACING.sm },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screen,
    paddingVertical: SPACING.md,
  },
  dayTitle: { ...TYPOGRAPHY.subheading },
  dayCount: { ...TYPOGRAPHY.caption },
  emptyRow: { paddingHorizontal: SPACING.screen, paddingVertical: SPACING.lg },
  emptyText: { ...TYPOGRAPHY.body },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.screen,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  eventInfo: { flex: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  eventTitle: { ...TYPOGRAPHY.bodyBold, marginBottom: 2 },
  eventMeta: { ...TYPOGRAPHY.caption },
});
