import React, { useState, useEffect } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE } from '../../ui/theme/tokens';
import { reportError } from '../../utils/reportError';
import { useSubscription } from '../../app/context/SubscriptionContext';
import { usePremiumShare } from '../../app/context/PremiumShareContext';
import { useConnectionsContext } from '../../app/context/ConnectionsContext';
import { DisplayConnection } from '../../app/bootstrap/useInvitations';
import { RootStackParamList } from '../../navigation/RootNavigator';

type RootNav = StackNavigationProp<RootStackParamList>;

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

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const FIREBASE_ENABLED = Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);

interface AuthProfile {
  displayName: string | null;
  email: string | null;
  uid: string | null;
}

function useAuthProfile(): AuthProfile {
  const [profile, setProfile] = useState<AuthProfile>({ displayName: null, email: null, uid: null });

  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        unsub = onAuthStateChanged(getAuth(), (user) => {
          setProfile(user
            ? { displayName: user.displayName, email: user.email, uid: user.uid }
            : { displayName: null, email: null, uid: null }
          );
        });
      } catch (e) {
        reportError('ProfileScreen.auth', e);
      }
    })();
    return () => unsub?.();
  }, []);

  return profile;
}

export default function ProfileScreen(): JSX.Element {
  const { theme, isDark, setPreference } = useAppTheme();
  const { top, bottom } = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { displayName, email, uid } = useAuthProfile();
  const { isPremium } = useSubscription();
  const { outgoingShare, incomingShare, isSharedWithMe, shareWith, revokeShare } = usePremiumShare();
  const { connections } = useConnectionsContext();

  const [showSharePicker, setShowSharePicker] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<DisplayConnection | null>(null);

  // Derive what to show in the header
  const headerName = displayName || email?.split('@')[0] || 'You';
  const headerSub = email ?? uid ?? '';

  const handleClearData = () => {
    Alert.alert(
      'Clear all data?',
      'This will permanently delete all your local events, tasks, and XP. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear data',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove local cache
              await AsyncStorage.multiRemove([
                '@uandme/events',
                '@uandme/tasks',
                '@uandme/xp_state',
              ]);

              // Delete Firestore tasks when authenticated
              if (FIREBASE_ENABLED && uid) {
                try {
                  const { getFirestore, collection, getDocs, writeBatch } = await import('firebase/firestore');
                  const db = getFirestore();
                  const snap = await getDocs(collection(db, 'users', uid, 'tasks'));
                  if (!snap.empty) {
                    const batch = writeBatch(db);
                    snap.docs.forEach((d) => batch.delete(d.ref));
                    await batch.commit();
                  }
                } catch (e) {
                  reportError('ProfileScreen.clearFirestoreTasks', e);
                }
              }

              Alert.alert('Done', 'All data cleared.');
            } catch (e) {
              reportError('ProfileScreen.clearData', e);
              Alert.alert('Error', 'Could not clear data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to sync your calendar.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            const { getAuth, signOut } = await import('firebase/auth');
            await signOut(getAuth());
          } catch (e) {
            reportError('ProfileScreen.signOut', e);
            Alert.alert('Error', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const handleManageSharing = () => {
    if (outgoingShare) {
      Alert.alert(
        `Sharing with ${outgoingShare.granteeName}`,
        'What would you like to do?',
        [
          {
            text: 'Change partner',
            onPress: () => {
              setSelectedConnection(null);
              setShowSharePicker(true);
            },
          },
          {
            text: 'Revoke access',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Revoke Plus access?',
                `${outgoingShare.granteeName} will lose access to premium features.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Revoke', style: 'destructive', onPress: revokeShare },
                ]
              );
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      setSelectedConnection(null);
      setShowSharePicker(true);
    }
  };

  const handleConfirmShare = async () => {
    if (!selectedConnection) return;
    await shareWith({
      uid: selectedConnection.partnerUid,
      name: selectedConnection.name,
      email: selectedConnection.email,
    });
    setShowSharePicker(false);
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open link', 'Please visit the URL in your browser.')
    );
  };

  const sections: { title: string; rows: SettingRow[] }[] = [
    {
      title: 'Reports',
      rows: [
        {
          icon: 'bar-chart-outline',
          label: 'Weekly Report',
          onPress: () => {
            if (isPremium) {
              nav.navigate('WeeklyReport');
            } else {
              nav.navigate('Paywall', { source: 'weekly_report' });
            }
          },
        },
      ],
    },
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
        { icon: 'information-circle-outline', label: 'Version', value: APP_VERSION },
        {
          icon: 'shield-checkmark-outline',
          label: 'Privacy Policy',
          onPress: () => openURL('https://uandme.app/privacy'),
        },
        {
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: () => openURL('https://uandme.app/terms'),
        },
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
        ...(FIREBASE_ENABLED && uid
          ? [{
              icon: 'log-out-outline' as IconName,
              label: 'Sign out',
              onPress: handleSignOut,
              destructive: true,
            }]
          : []),
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
            <Text style={styles.avatarLetter}>
              {headerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>{headerName}</Text>
          {headerSub ? (
            <Text style={styles.userSub} numberOfLines={1}>{headerSub}</Text>
          ) : null}
        </LinearGradient>

        {/* U&Me Plus card */}
        <View style={styles.plusSection}>
          {isPremium ? (
            <TouchableOpacity
              style={[styles.plusCard, styles.plusCardActive, { backgroundColor: theme.bg.card, borderColor: theme.success }]}
              onPress={() => nav.navigate('Paywall', { source: 'profile_active' })}
              activeOpacity={0.8}
              accessibilityLabel="View U&Me Plus benefits"
              accessibilityRole="button"
            >
              <View style={[styles.plusIconWrap, { backgroundColor: `${theme.success}18` }]}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.plusTitle, { color: theme.text.primary }]}>U&Me Plus · Active</Text>
                <Text style={[styles.plusSub, { color: theme.text.secondary }]}>All premium features unlocked</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.plusCard, { overflow: 'hidden' }]}
              onPress={() => nav.navigate('Paywall', { source: 'profile' })}
              activeOpacity={0.85}
              accessibilityLabel="Upgrade to U&Me Plus"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={theme.gradient.primary}
                style={styles.plusCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.plusIconWrapWhite}>
                  <Ionicons name="crown" size={20} color={PALETTE.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.plusTitle, { color: PALETTE.white }]}>Upgrade to U&Me Plus</Text>
                  <Text style={[styles.plusSub, { color: 'rgba(255,255,255,0.8)' }]}>Unlimited connections & more</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PALETTE.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.whatsIncludedBtn}
            onPress={() => nav.navigate('Paywall', { source: 'whats_included' })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="See what's included in U&Me Plus"
            accessibilityRole="button"
          >
            <Text style={[styles.whatsIncludedText, { color: theme.text.accent }]}>
              See what's included in Plus
            </Text>
            <Ionicons name="arrow-forward" size={13} color={theme.text.accent} />
          </TouchableOpacity>
        </View>

        {/* Premium sharing card */}
        {(isPremium || isSharedWithMe) && (
          <View style={styles.sharingSection}>
            <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>PLUS SHARING</Text>
            <TouchableOpacity
              style={[styles.sectionCard, styles.sharingCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}
              onPress={isPremium ? handleManageSharing : undefined}
              disabled={!isPremium}
              activeOpacity={0.8}
              accessibilityLabel={isPremium ? 'Manage Plus sharing' : undefined}
              accessibilityRole={isPremium ? 'button' : 'none'}
            >
              {isPremium ? (
                <>
                  <View style={[styles.iconWrap, { backgroundColor: `${theme.primary}18` }]}>
                    <Ionicons name="gift-outline" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {outgoingShare ? (
                      <>
                        <Text style={[styles.rowLabel, { color: theme.text.primary }]}>
                          Sharing with {outgoingShare.granteeName}
                        </Text>
                        <Text style={[styles.sharingSubLabel, { color: theme.text.secondary }]}>
                          {outgoingShare.granteeEmail}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.rowLabel, { color: theme.text.primary }]}>
                        Share Plus with a partner
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
                </>
              ) : (
                /* isSharedWithMe — grantee view */
                <>
                  <View style={[styles.iconWrap, { backgroundColor: `${theme.success}18` }]}>
                    <Ionicons name="heart" size={18} color={theme.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: theme.text.primary }]}>
                      Plus shared by {incomingShare?.grantorName ?? 'a partner'}
                    </Text>
                    <Text style={[styles.sharingSubLabel, { color: theme.text.secondary }]}>
                      You have full access to premium features
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

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
                    activeOpacity={0.8}
                    accessibilityLabel={row.label}
                    accessibilityRole={row.toggle ? 'none' : 'button'}
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

      {/* Share-with partner picker modal */}
      {showSharePicker && (
        <Modal
          visible={showSharePicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowSharePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerSheet, { backgroundColor: theme.bg.card }]}>
              <Text style={[styles.pickerTitle, { color: theme.text.primary }]}>
                Share Plus with a partner
              </Text>
              <Text style={[styles.pickerSub, { color: theme.text.secondary }]}>
                Your connected partner will also unlock all U&Me Plus features.
              </Text>

              {connections.length === 0 ? (
                <View style={styles.emptyConnections}>
                  <Ionicons name="people-outline" size={36} color={theme.text.tertiary} />
                  <Text style={[styles.emptyConnText, { color: theme.text.secondary }]}>
                    No connections yet. Add a partner from the Connections tab first.
                  </Text>
                </View>
              ) : (
                <View style={[styles.pickerList, { borderColor: theme.border.default }]}>
                  {connections.map((conn, i) => {
                    const selected = selectedConnection?.id === conn.id;
                    return (
                      <React.Fragment key={conn.id}>
                        {i > 0 && <View style={[styles.pickerDivider, { backgroundColor: theme.border.subtle }]} />}
                        <TouchableOpacity
                          style={[
                            styles.pickerRow,
                            selected && { backgroundColor: `${theme.primary}12` },
                          ]}
                          onPress={() => setSelectedConnection(selected ? null : conn)}
                          activeOpacity={0.7}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                        >
                          <View style={[styles.connAvatar, { backgroundColor: conn.color }]}>
                            <Text style={styles.connAvatarText}>{conn.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.connName, { color: theme.text.primary }]}>{conn.name}</Text>
                            <Text style={[styles.connEmail, { color: theme.text.secondary }]}>{conn.email}</Text>
                          </View>
                          {selected && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[styles.shareBtn, { opacity: selectedConnection ? 1 : 0.4 }]}
                onPress={handleConfirmShare}
                disabled={!selectedConnection}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={theme.gradient.primary}
                  style={styles.shareBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.shareBtnText}>
                    {selectedConnection ? `Share with ${selectedConnection.name}` : 'Select a partner'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowSharePicker(false)}
                hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              >
                <Text style={[styles.skipText, { color: theme.text.tertiary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerGradient: {
    alignItems: 'center',
    paddingBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.screen,
    gap: SPACING.sm,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarLetter: { fontSize: 36, fontWeight: '700', color: PALETTE.white },
  userName: { ...TYPOGRAPHY.heading, color: PALETTE.white },
  userSub: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.7)', maxWidth: 260 },
  plusSection: { paddingHorizontal: SPACING.screen, marginTop: SPACING.xl },
  plusCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOW.sm,
  },
  plusCardActive: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  plusCardGradient: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md, borderRadius: RADIUS.xl },
  plusIconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  plusIconWrapWhite: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  plusTitle: { ...TYPOGRAPHY.bodyBold },
  plusSub: { ...TYPOGRAPHY.caption, marginTop: 1 },
  whatsIncludedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  whatsIncludedText: { ...TYPOGRAPHY.caption },
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
  // Sharing card
  sharingSection: { paddingHorizontal: SPACING.screen, marginTop: SPACING.xl },
  sharingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  sharingSubLabel: { ...TYPOGRAPHY.caption, marginTop: 2 },
  // Share picker modal
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerSheet: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  pickerTitle: { ...TYPOGRAPHY.subheading, textAlign: 'center' },
  pickerSub: { ...TYPOGRAPHY.body, textAlign: 'center', lineHeight: 20 },
  emptyConnections: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xl },
  emptyConnText: { ...TYPOGRAPHY.body, textAlign: 'center' },
  pickerList: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  pickerDivider: { height: 1, marginLeft: SPACING.md + 40 + SPACING.md },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  connAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connAvatarText: { ...TYPOGRAPHY.bodyBold, color: PALETTE.white },
  connName: { ...TYPOGRAPHY.bodyBold },
  connEmail: { ...TYPOGRAPHY.caption, marginTop: 1 },
  shareBtn: { borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOW.md, marginTop: SPACING.sm },
  shareBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  shareBtnText: { ...TYPOGRAPHY.subheading, color: PALETTE.white },
  skipText: { ...TYPOGRAPHY.caption, textAlign: 'center' },
});
