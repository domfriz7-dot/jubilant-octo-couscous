import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE } from '../ui/theme/tokens';
import { getUserId } from '../services/IdentityService';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingRow {
  icon: IconName;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
}

export default function ProfileScreen(): JSX.Element {
  const { theme, isDark, preference, setPreference } = useAppTheme();
  const { top, bottom } = useSafeAreaInsets();
  const userId = getUserId();

  const handleClearData = () => {
    Alert.alert(
      'Clear all data?',
      'This will permanently delete all your events and tasks. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear data',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              '@uandme/events',
              '@uandme/tasks',
              '@uandme/xp_state',
            ]);
            Alert.alert('Done', 'All data cleared.');
          },
        },
      ]
    );
  };

  const sections: { title: string; rows: SettingRow[] }[] = [
    {
      title: 'Appearance',
      rows: [
        {
          icon: 'moon',
          label: 'Dark mode',
          toggle: true,
          toggleValue: isDark,
          onToggle: (v) => setPreference(v ? 'dark' : 'light'),
        },
      ],
    },
    {
      title: 'About',
      rows: [
        { icon: 'information-circle-outline', label: 'Version', value: '1.0.0' },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy' },
        { icon: 'document-text-outline', label: 'Terms of Service' },
      ],
    },
    {
      title: 'Data',
      rows: [
        {
          icon: 'trash-outline',
          label: 'Clear all data',
          onPress: handleClearData,
          destructive: true,
        },
      ],
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottom + SPACING.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar header */}
        <LinearGradient
          colors={theme.gradient.primary}
          style={[styles.headerGradient, { paddingTop: top + SPACING.xl }]}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🧑</Text>
          </View>
          <Text style={styles.userName}>You</Text>
          <Text style={styles.userId} numberOfLines={1}>{userId}</Text>
        </LinearGradient>

        {/* Settings sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
              {section.rows.map((row, i) => (
                <React.Fragment key={row.label}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />}
                  <TouchableOpacity
                    style={styles.row}
                    onPress={row.onPress}
                    disabled={row.toggle || !row.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: row.destructive ? `${theme.danger}18` : theme.bg.elevated }]}>
                      <Ionicons
                        name={row.icon}
                        size={18}
                        color={row.destructive ? theme.danger : theme.primary}
                      />
                    </View>
                    <Text style={[styles.rowLabel, { color: row.destructive ? theme.text.danger : theme.text.primary }]}>
                      {row.label}
                    </Text>
                    {row.toggle ? (
                      <Switch
                        value={row.toggleValue}
                        onValueChange={row.onToggle}
                        trackColor={{ false: theme.border.default, true: theme.primary }}
                        thumbColor={PALETTE.white}
                      />
                    ) : row.value ? (
                      <Text style={[styles.rowValue, { color: theme.text.secondary }]}>{row.value}</Text>
                    ) : (
                      !row.destructive && <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerGradient: {
    alignItems: 'center',
    paddingBottom: SPACING.xxxl,
    gap: SPACING.sm,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarEmoji: { fontSize: 40 },
  userName: { ...TYPOGRAPHY.heading, color: PALETTE.white },
  userId: { ...TYPOGRAPHY.label, color: 'rgba(255,255,255,0.6)', maxWidth: 200 },
  section: { paddingHorizontal: SPACING.screen, marginTop: SPACING.xl },
  sectionTitle: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  sectionCard: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...TYPOGRAPHY.body, flex: 1 },
  rowValue: { ...TYPOGRAPHY.body },
  divider: { height: 1, marginLeft: 62 },
});
