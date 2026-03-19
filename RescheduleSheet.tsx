import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const Updates = require('expo-updates');
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import Screen from '../ui/components/Screen';
import LoadingState from '../ui/components/LoadingState';
import Header from '../ui/components/Header';
import AppText from '../ui/components/AppText';
import SettingSection from '../ui/components/SettingSection';
import SettingToggle from '../ui/components/SettingToggle';
import SettingChoice from '../ui/components/SettingChoice';
import { SettingRow } from '../ui/components/SettingRow';
import SettingsService from '../services/SettingsService';
import DataBackupService from '../services/DataBackupService';
import CalendarIOService from '../services/CalendarIOService';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { USER_SETUP_KEY } from '../app/bootstrap/useOnboardingGate';
import TutorialService from '../services/TutorialService';
import CalendarService from '../services/CalendarService';
import ConnectionsService from '../services/ConnectionsService';
import TasksService from '../services/TasksService';
import XPService from '../services/XPService';
import NotificationService from '../services/NotificationService';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { tokens } from '../config/tokens';
import { haptics } from '../ui/haptics';
import { logError } from '../services/logger';
import { getFirebaseAuth } from '../services/backend/firebaseClient';
import { logout } from '../services/AuthService';
import type { AppSettings, SettingsKey } from '../config/settingsSchema';
import appJson from '../../app.json';

const DURATIONS = [15, 30, 45, 60, 90, 120];

const COLOR_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: 'Clay', value: tokens.people.clay },
  { label: 'Sage', value: tokens.palette.sage },
  { label: 'Sky', value: tokens.palette.sky },
  { label: 'Amber', value: tokens.palette.amber },
  { label: 'Coral', value: tokens.palette.coral },
  { label: 'Slate', value: tokens.tags.slate },
];

function colorLabel(val: string) {
  const hit = COLOR_OPTIONS.find((o) => o.value === val);
  return hit ? hit.label : 'Custom';
}

export default function SettingsScreen({ navigation }: { navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme, setThemeMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const load = useCallback(async () => {
    const s = await SettingsService.get();
    setSettings(s);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateSetting = useCallback(async <K extends SettingsKey>(key: K, value: AppSettings[K]) => {
    const next = await SettingsService.update(key, value);
    setSettings(next);

    // Side effects
    if (key === 'theme') {
      const mode = value === 'Light' ? 'light' : value === 'Dark' ? 'dark' : 'system';
      setThemeMode(mode);
    }

    // Notification preferences sync
    const notificationKeys = new Set([
      'eventReminders',
      'dailyDigest',
      'digestHour',
      'digestMinute',
      'nudges',
      'eventChanges',
      'weeklyReport',
      'weeklyReportDay',
      'weeklyReportHour',
    ]);

    if (notificationKeys.has(String(key))) {
      try {
        const prefs = await NotificationService.getPreferences();
        const nextPrefs = { ...prefs, [key]: value };
        await NotificationService.savePreferences(nextPrefs);

        // Keep scheduled notifs consistent with prefs
        if (key === 'dailyDigest' || key === 'digestHour' || key === 'digestMinute') {
          await NotificationService.scheduleDailyDigest();
        }
        if (key === 'weeklyReport' || key === 'weeklyReportDay' || key === 'weeklyReportHour') {
          await NotificationService.scheduleWeeklyReport();
        }
      } catch {
        // non-fatal
        // Intentionally ignored — non-critical failure
      }
    }
  }, [setThemeMode]);

  const doExport = useCallback(async () => {
    haptics.light();
    const json = await SettingsService.exportAllData();
    if (!json) { Alert.alert('Export failed', 'Could not export data right now.'); return; }
    await Clipboard.setStringAsync(json);
    Alert.alert('Export ready', 'Your data export JSON was copied to your clipboard. Paste it somewhere safe.');
  }, []);


  const exportCalendar = useCallback(async () => {
    try {
      haptics.light();
      const filePath = await CalendarIOService.exportToICS();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/calendar',
          dialogTitle: 'Export U&Me Calendar',
        });
        haptics.success();
      } else {
        Alert.alert('Export Complete', `File saved to: ${filePath}`);
      }
    } catch (error) {
      haptics.error();
      Alert.alert('Export Failed', error?.message || 'Could not export calendar');
      logError('SettingsScreen.exportCalendar', error);
    }
  }, []);

  const importCalendar = useCallback(async () => {
    try {
      haptics.light();
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/calendar', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result?.canceled) return;
      const asset = Array.isArray(result?.assets) ? result.assets[0] : null;
      const uri = asset?.uri || (result as { uri?: string })?.uri;
      if (!uri) {
        throw new Error('No calendar file selected.');
      }
      const imported = await CalendarIOService.importFromICS(uri);
      haptics.success();
      Alert.alert('Import Successful', `Imported ${imported.length} event${imported.length === 1 ? '' : 's'}`);
    } catch (error: unknown) {
      haptics.error();
      Alert.alert('Import Failed', error?.message || 'Could not import calendar');
      logError('SettingsScreen.importCalendar', error);
    }
  }, []);

  const doClearCache = useCallback(async () => {
    Alert.alert('Clear cache?', 'This will clear temporary caches/logs. Your events, tasks and memories will stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const ok = await SettingsService.clearCache();
        Alert.alert(ok ? 'Cleared' : 'Failed', ok ? 'Cache cleared.' : 'Could not clear cache.');
      }},
    ]);
  }, []);

  const doBackup = useCallback(async () => {
    haptics.light();
    const result = await DataBackupService.createBackup();
    if (result) {
      Alert.alert('Backup created', `Saved ${result.keyCount} data stores locally.`);
    } else {
      Alert.alert('Backup failed', 'Could not create backup right now.');
    }
  }, []);

  const doRestore = useCallback(async () => {
    const backups = await DataBackupService.getBackupList();
    if (backups.length === 0) {
      Alert.alert('No backups', 'No local backups available. Create one first.');
      return;
    }
    const latest = backups[0];
    const when = new Date(latest.createdAt).toLocaleString();
    Alert.alert(
      'Restore data?',
      `This will restore your data from ${when}. Current data will be overwritten.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: async () => {
          const ok = await DataBackupService.restoreBackup(latest.id);
          Alert.alert(ok ? 'Restored' : 'Failed', ok ? 'Data restored. Restart the app to see changes.' : 'Could not restore backup.');
        }},
      ]
    );
  }, []);


  const doFactoryReset = useCallback(async () => {
    Alert.alert('Clear local data?', 'This will fully reset this device, remove local app data, and send you back to onboarding.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await CalendarService.clearAll();
            await ConnectionsService.clearAll();
            await TasksService.clearAll();
            try { await XPService.initialize(); } catch (e) { logError('SettingsScreen.resetXP', e); }
            await TutorialService.resetTutorial();
            const keys = await AsyncStorage.getAllKeys();
            const target = keys.filter((k) => String(k).startsWith('@uandme_'));
            await AsyncStorage.multiRemove(target);
            await AsyncStorage.setItem(USER_SETUP_KEY, 'false');
            haptics.success();
            try {
              await Updates.reloadAsync();
            } catch (e) {
              logError('SettingsScreen.reloadAfterFactoryReset', e);
              Alert.alert('Done', 'Local data cleared. Please restart the app to go through onboarding again.');
            }
          } catch (e) {
            logError('SettingsScreen.doFactoryReset', e);
            haptics.error();
            Alert.alert('Failed', 'Could not clear local data right now.');
          }
        },
      },
    ]);
  }, []);

  if (!settings) return <Screen><Header title="Settings" leftAction={{ icon:'arrow-left', label:'Back', onPress: () => navigation.goBack() }} /><LoadingState message="Loading settings..." /></Screen>;

  const authUser = getFirebaseAuth()?.currentUser ?? null;

  return (
    <Screen>
      <Header title="Settings" leftAction={{ icon:'arrow-left', label:'Back', onPress: () => navigation.goBack() }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { flexGrow: 1, paddingBottom: Math.max(insets.bottom, 24) + 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {authUser ? (
          <SettingSection title="Account">
            <SettingRow
              label="Signed in"
              description={authUser.email ?? 'Firebase account'}
              right={<AppText variant="body" color="secondary"> </AppText>}
            />
            <SettingRow
              label="Log out"
              description="Sign out of this device."
              onPress={() => {
                Alert.alert('Log out?', 'You can log back in anytime.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log out',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await logout();
                      } catch (e: unknown) {
                        Alert.alert('Log out failed', e instanceof Error ? e.message : 'Please try again.');
                      }
                    },
                  },
                ]);
              }}
              showChevron
            />
          </SettingSection>
        ) : null}
        <SettingSection title="Notifications">
          <SettingToggle
            label="Event Reminders"
            description="Get reminders before upcoming plans."
            value={settings.eventReminders}
            onChange={(v) => updateSetting('eventReminders', v)}
          />
          <SettingToggle
            label="Daily Digest"
            description="A morning summary of what’s ahead."
            value={settings.dailyDigest}
            onChange={(v) => updateSetting('dailyDigest', v)}
          />
        </SettingSection>

        <SettingSection title="Appearance">
          <SettingChoice
            label="Theme"
            description="Auto follows your device setting."
            options={['Auto','Light','Dark']}
            value={settings.theme}
            onChange={(v) => updateSetting('theme', v as AppSettings['theme'])}
          />
        </SettingSection>

        <SettingSection title="Language">
          <SettingChoice
            label="App language"
            description="Choose your preferred language for the app."
            options={['English','Spanish','Japanese','Indonesian']}
            value={settings.language}
            onChange={(v) => updateSetting('language', v as AppSettings['language'])}
          />
        </SettingSection>

        <SettingSection title="Calendar">
          <SettingChoice
            label="Default event duration"
            options={DURATIONS.map(String)}
            value={`${settings.defaultEventDuration}`}
            onChange={(v) => updateSetting('defaultEventDuration', Number(v))}
          />
          <SettingRow
            label="Default event color"
            description="Used for new events unless you choose another."
            onPress={() => {
              // iOS ActionSheet handled by SettingChoice pattern (cycle on Android)
              const opts = COLOR_OPTIONS.map((o) => o.label);
              const current = colorLabel(settings.defaultEventColor);
              const i = Math.max(0, opts.indexOf(current));
              const next = COLOR_OPTIONS[(i + 1) % COLOR_OPTIONS.length];
              updateSetting('defaultEventColor', next.value);
            }}
            showChevron
            right={<AppText variant="body" color="secondary">{colorLabel(settings.defaultEventColor)}</AppText>}
          />
          <SettingChoice
            label="Calendar view"
            options={['week','month']}
            value={settings.calendarView}
            onChange={(v) => updateSetting('calendarView', v as AppSettings['calendarView'])}
          />
          <SettingChoice
            label="First day of week"
            options={['Mon','Sun']}
            value={settings.firstDayOfWeek}
            onChange={(v) => updateSetting('firstDayOfWeek', v as AppSettings['firstDayOfWeek'])}
          />
          <SettingChoice
            label="Time format"
            options={['12h','24h']}
            value={settings.timeFormat}
            onChange={(v) => updateSetting('timeFormat', v as AppSettings['timeFormat'])}
          />
        </SettingSection>

        <SettingSection title="Data">
          <SettingRow
            label="Export data"
            description="Copies a JSON export to your clipboard."
            onPress={doExport}
            showChevron
            right={null}
          />
          <SettingRow
            label="Create backup"
            description="Save a local snapshot of your data."
            onPress={doBackup}
            showChevron
            right={null}
          />
          <SettingRow
            label="Restore backup"
            description="Restore from a previous local snapshot."
            onPress={doRestore}
            showChevron
            right={null}
          />
          <SettingRow
            label="Clear cache"
            description="Fixes odd UI issues without deleting your data."
            onPress={doClearCache}
            showChevron
            right={null}
          />
          <SettingRow
            label="Clear local data"
            description="Reset this device and start onboarding again."
            onPress={doFactoryReset}
            showChevron
            right={null}
          />
        </SettingSection>

        <SettingSection title="About">
          <AboutRows />
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

function AboutRows() {
  const { theme } = useAppTheme();
  const version = (appJson as { expo?: { version?: string } })?.expo?.version || '';
  return (
    <>
      <SettingRow label="Version" description={version ? `v${version}` : ''} right={null} />
      <SettingRow label="U&Me" description="Calendar + relationship autopilot" right={null} />
    </>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.sm },
});
