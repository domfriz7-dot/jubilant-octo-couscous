import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';

import type { RootStackParamList } from '../navigation/types';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Button from '../ui/components/Button';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';

type Props = StackScreenProps<RootStackParamList, 'CalendarImportSuccess'>;

export default function CalendarImportSuccessScreen({ navigation, route }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { imported = 0, added = 0, total = 0 } = route.params || {};

  // Calendar lives inside the MainTabs navigator as "CalendarTab".
  // Navigating to "Calendar" directly will fail because there is no root route with that name.
  const goToCalendar = () => navigation.navigate('MainTabs', { screen: 'CalendarTab' });

  const skipped = imported - added;

  return (
    <Screen>
      <Header
        title="Import Complete"
        leftAction={{ icon: 'x', onPress: goToCalendar }}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.container, { paddingBottom: Math.max(insets.bottom, 24) + 80 }]} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={[st.successIcon, { backgroundColor: theme.accent.primary + '15' }]}>
          <Feather name="check-circle" size={24} color={theme.accent.primary} />
        </View>

        {/* Success Message */}
        <AppText style={[st.title, { color: theme.text.primary }]}>
          {added} Event{added === 1 ? '' : 's'} Imported!
        </AppText>

        <AppText style={[st.subtitle, { color: theme.text.secondary }]}>
          Your calendar events are now in U&Me
        </AppText>

        {/* Stats Cards */}
        <View style={st.statsRow}>
          <Card style={st.statCard}>
            <AppText style={[st.statNumber, { color: theme.accent.primary }]}>{total}</AppText>
            <AppText style={[st.statLabel, { color: theme.text.secondary }]}>Found</AppText>
          </Card>

          <Card style={st.statCard}>
            <AppText style={[st.statNumber, { color: theme.success }]}>{added}</AppText>
            <AppText style={[st.statLabel, { color: theme.text.secondary }]}>Added</AppText>
          </Card>

          {skipped > 0 && (
            <Card style={st.statCard}>
              <AppText style={[st.statNumber, { color: theme.text.tertiary }]}>{skipped}</AppText>
              <AppText style={[st.statLabel, { color: theme.text.secondary }]}>Skipped</AppText>
            </Card>
          )}
        </View>

        {/* Info Notes */}
        {skipped > 0 && (
          <Card style={{ backgroundColor: theme.bg.muted, marginTop: tokens.space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Feather name="info" size={16} color={theme.text.secondary} style={{ marginTop: 2 }} />
              <AppText style={{ flex: 1, marginLeft: 10, fontSize: 13, color: theme.text.secondary, lineHeight: 18 }}>
                {skipped} event{skipped === 1 ? ' was' : 's were'} skipped because {skipped === 1 ? 'it' : 'they'} already existed in U&Me
              </AppText>
            </View>
          </Card>
        )}

        <Card style={{ backgroundColor: theme.accent.light, marginTop: tokens.space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Feather name="shield" size={16} color={theme.accent.primary} style={{ marginTop: 2 }} />
            <AppText style={{ flex: 1, marginLeft: 10, fontSize: 13, color: theme.text.secondary, lineHeight: 18 }}>
              Your original calendars were not modified. Imported events are separate copies in U&Me.
            </AppText>
          </View>
        </Card>

        {/* Actions */}
        <View style={st.actions}>
          <Button
            title="View Calendar"
            onPress={() => {
              haptics.success();
              goToCalendar();
            }}
            style={{ marginBottom: tokens.space.sm }}
          />

          <Button
            title="Import More"
            variant="secondary"
            onPress={() => {
              haptics.light();
              navigation.goBack();
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    padding: tokens.space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.xl,
  },
  title: {
    fontSize: tokens.type.size.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: tokens.space.sm,
  },
  subtitle: {
    fontSize: tokens.type.size.lg,
    textAlign: 'center',
    marginBottom: tokens.space.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: tokens.space.md,
    marginBottom: tokens.space.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: tokens.space.lg,
  },
  statNumber: {
    fontSize: tokens.type.size.hero,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: tokens.type.size.xs,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    width: '100%',
    marginTop: tokens.space.xl,
  },
});
