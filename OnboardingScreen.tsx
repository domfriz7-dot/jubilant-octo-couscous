/**
 * ProfileScreen — Premium profile with identity card, XP progression,
 * feature hub, and appearance settings.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
const Updates = require('expo-updates');
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CalendarService from '../services/CalendarService';
import ConnectionsService from '../services/ConnectionsService';
import TasksService from '../services/TasksService';
import XPService from '../services/XPService';
import CalendarImportService from '../services/CalendarImportService';
import TutorialService from '../services/TutorialService';
import { USER_SETUP_KEY } from '../app/bootstrap/useOnboardingGate';
import KeyboardScreen from '../ui/components/KeyboardScreen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Avatar from '../ui/components/Avatar';
import Button from '../ui/components/Button';
import Input from '../ui/components/Input';
import LoadingState from '../ui/components/LoadingState';
import PressableScale from '../ui/components/PressableScale';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { useTranslate } from '../i18n';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import { logError } from '../services/logger';

const USER_PROFILE_KEY = '@uandme_user_profile';
const AVATAR_COLORS = tokens.peopleArray;

export default function ProfileScreen({ navigation }) {
  const { theme, isDark, themeMode, setThemeMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tr = useTranslate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editColor, setEditColor] = useState(AVATAR_COLORS[0]);
  const [photoUri, setPhotoUri] = useState(null);
  const [xpData, setXPData] = useState(null);
  const [levelInfo, setLevelInfo] = useState(null);
  const barAnim = useRef(new Animated.Value(0)).current;

  const loadXP = useCallback(async () => {
    try {
      const data = await XPService.loadXPData();
      setXPData(data);
      setLevelInfo(XPService.getLevelInfo(data?.totalXP || 0));
    } catch (e) { logError('ProfileScreen.loadXP', e); }
  }, []);

  const reloadProfile = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      setProfile(parsed);
      setEditName(parsed?.name || '');
      setEditEmail(parsed?.email || '');
      setEditBio(parsed?.bio || '');
      setEditColor(parsed?.color || AVATAR_COLORS[0]);
      setPhotoUri(parsed?.photoUri || null);
    } catch (e) { logError('ProfileScreen.reloadProfile', e); }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try { await Promise.all([reloadProfile(), loadXP()]); }
    catch (e) { logError('ProfileScreen.loadAll', e); }
    finally { setLoading(false); }
  }, [reloadProfile, loadXP]);

  useEffect(() => {
    loadAll();
    const unsub = XPService.subscribe(loadXP);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [loadAll, loadXP]);

  useEffect(() => {
    Animated.timing(barAnim, { toValue: levelInfo?.progress || 0, duration: 600, useNativeDriver: false }).start();
  }, [barAnim, levelInfo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadAll(); } catch (e) { logError('ProfileScreen.onRefresh', e); }
    finally { setRefreshing(false); }
  }, [loadAll]);

  const pickPhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert(tr('Permission needed'), tr('Allow photo access to set your profile picture.')); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!result.canceled && result.assets?.[0]?.uri) { setPhotoUri(result.assets[0].uri); haptics.success(); }
    } catch (e) { logError('ProfileScreen.pickPhoto', e); haptics.error(); }
  }, [tr]);

  const saveProfile = useCallback(async () => {
    try {
      const updated = { id: profile?.id || 'self', ...(profile || {}), name: editName.trim(), email: editEmail.trim(), bio: editBio.trim(), color: editColor, photoUri: photoUri || null };
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));
      setProfile(updated);
      setEditing(false);
      haptics.success();
    } catch (e) { logError('ProfileScreen.saveProfile', e); haptics.error(); }
  }, [profile, editName, editEmail, editBio, editColor, photoUri]);

  const clearData = useCallback(() => {
    Alert.alert(tr('Clear all data?'), tr('Removes events, tasks, connections and XP.'), [
      { text: tr('Cancel'), style: 'cancel' },
      { text: tr('Clear'), style: 'destructive', onPress: async () => {
        try {
          await CalendarService.clearAll(); await ConnectionsService.clearAll(); await TasksService.clearAll();
          await AsyncStorage.multiRemove([USER_PROFILE_KEY, USER_SETUP_KEY, '@uandme_settings', '@uandme_tutorial_state_v1', '@uandme_task_data', '@uandme_calendar_events', '@uandme_connections', '@uandme_shared_events', '@uandme_moments', '@uandme_xp_data', '@uandme_invites']);
          haptics.success();
          Alert.alert(tr('Done'), 'Local data cleared. The app will restart.', [{ text: 'OK', onPress: async () => { try { await Updates.reloadAsync(); } catch (e) { logError('ProfileScreen.reload', e); } } }]);
        } catch (e) { logError('ProfileScreen.clearData', e); haptics.error(); }
      }},
    ]);
  }, [tr]);

  const pct = Math.round((levelInfo?.progress || 0) * 100);

  const FEATURES = [
    { icon: 'cpu',        color: '#D9A566', label: 'Autopilot',         desc: 'Auto date-night scheduling',        route: 'Autopilot' },
    { icon: 'heart',      color: '#C06B65', label: 'Relationship Engine', desc: 'Balance, nudges & weekly rhythm',  route: 'RelationshipEngine' },
    { icon: 'bar-chart-2', color: '#6B9B7F', label: 'Intelligence Hub',  desc: 'Health, risks & guidance',          route: 'WeeklyReport' },
    { icon: 'bookmark',   color: '#7B93B3', label: 'Memory Timeline',   desc: 'Milestones & shared moments',       route: 'MemoryTimeline' },
    { icon: 'moon',       color: '#B8897A', label: 'Tonight Suggestion', desc: 'Quick win for your energy level',   route: 'TonightSuggestion' },
  ];

  const QUICK_LINKS = [
    { label: 'Import from Calendar', icon: 'download', onPress: async () => { try { await CalendarImportService.quickImportFlow(navigation); } catch (e) { logError('Profile.import', e); } } },
    { label: 'Share calendar',       icon: 'share',    onPress: () => navigation.navigate('ShareCalendar') },
    { label: 'Shared events',        icon: 'link',     onPress: () => navigation.navigate('Shared') },
    { label: 'Replay tutorial',      icon: 'play-circle', onPress: async () => { await TutorialService.resetTutorial(); navigation.navigate('MainTabs', { screen: 'Home' }); } },
  ];

  if (loading) return (<KeyboardScreen><Header title={tr('Profile')} /><View style={{ padding: 16 }}><LoadingState message={tr('Loading profile…')} count={3} /></View></KeyboardScreen>);

  return (
    <KeyboardScreen>
      <Header title={tr('Profile')} rightAction={{ icon: editing ? 'check' : 'edit-2', label: editing ? tr('Save') : tr('Edit'), onPress: editing ? saveProfile : () => setEditing(true) }} />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        contentContainerStyle={[st.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} />}>

        {/* ── Identity Card ── */}
        <Card variant="premium" style={st.identity}>
          <LinearGradient colors={isDark ? [theme.accent.primary + '10', 'transparent'] : [theme.accent.primary + '08', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={st.identityGlow} />
          <View style={[st.avatarRing, { borderColor: theme.accent.primary + '25' }]}>
            <Avatar name={editing ? editName : profile?.name} color={editing ? editColor : profile?.color || theme.accent.primary}
              uri={photoUri || undefined} size={96} onPress={editing ? pickPhoto : undefined} editable={editing} />
          </View>
          {editing ? (
            <View style={{ width: '100%', marginTop: 20 }}>
              <Input label={tr('Name')} value={editName} onChangeText={setEditName} placeholder={tr('Name')} />
              <Input label={tr('Email')} value={editEmail} onChangeText={setEditEmail} placeholder={tr('Email')} keyboardType="email-address" autoCapitalize="none" style={{ marginTop: 12 }} />
              <Input label={tr('Bio')} value={editBio} onChangeText={setEditBio} placeholder={tr('Short bio (optional)')} multiline style={{ marginTop: 12 }} />
              <View style={st.colorRow}>
                {AVATAR_COLORS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setEditColor(c)} accessibilityRole="button" activeOpacity={0.8}
                    style={[st.colorDot, { backgroundColor: c }, editColor === c && { borderWidth: 2.5, borderColor: theme.text.primary }]} />
                ))}
              </View>
            </View>
          ) : (
            <>
              <AppText variant="h3" style={{ marginTop: 14 }}>{profile?.name || tr('User')}</AppText>
              {!!profile?.email && <AppText variant="bodySm" color="secondary" style={{ marginTop: 4 }}>{profile.email}</AppText>}
              {!!profile?.bio && <AppText variant="bodySm" color="secondary" style={{ marginTop: 6, textAlign: 'center', maxWidth: 260, lineHeight: 20 }}>{profile.bio}</AppText>}
            </>
          )}
        </Card>

        {/* ── XP & Level ── */}
        <Card style={st.xpCard}>
          <View style={st.xpHeader}>
            <View>
              <AppText variant="caption" color="tertiary" style={st.xpLabel}>LEVEL</AppText>
              <AppText variant="h3" style={{ letterSpacing: -0.5 }}>{levelInfo?.level || 1}</AppText>
            </View>
            <View style={st.xpBadge}>
              <Feather name="zap" size={16} color="#D9A566" />
              <AppText variant="label" style={{ marginLeft: 6, color: '#D9A566' }}>{xpData?.totalXP || 0} XP</AppText>
            </View>
          </View>
          <View style={[st.barTrack, { backgroundColor: theme.accent.primary + '15' }]}>
            <Animated.View style={[st.barFill, { width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
              <LinearGradient colors={['#C49485', '#A07060']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
          <AppText variant="caption" color="tertiary" style={{ marginTop: 8 }}>{pct}% to Level {(levelInfo?.level || 1) + 1}</AppText>
        </Card>

        {/* ── Stats Row ── */}
        <View style={st.statsRow}>
          {[
            { icon: 'check-square', value: xpData?.stats?.tasksCompleted || 0, label: 'Tasks', color: '#6B9B7F' },
            { icon: 'calendar',     value: xpData?.stats?.eventsCreated || 0,  label: 'Events', color: '#D9A566' },
            { icon: 'zap',          value: xpData?.streaks?.current || 0,      label: 'Streak', color: '#C06B65' },
            { icon: 'trending-up',  value: xpData?.streaks?.best || 0,         label: 'Best',   color: '#7B93B3' },
          ].map((s) => (
            <Card key={s.label} variant="outlined" style={st.statTile}>
              <View style={[st.statIcon, { backgroundColor: s.color + '12' }]}>
                <Feather name={s.icon} size={14} color={s.color} />
              </View>
              <AppText style={st.statValue}>{s.value}</AppText>
              <AppText variant="caption" color="tertiary">{s.label}</AppText>
            </Card>
          ))}
        </View>

        {/* ── Features ── */}
        <AppText variant="caption" color="tertiary" style={st.sectionLabel}>FEATURES</AppText>
        <Card padded={false}>
          {FEATURES.map((f, i) => (
            <PressableScale key={f.route} onPress={async () => {
              const conns = await ConnectionsService.getAllUsers();
              if (['Autopilot','MemoryTimeline','TonightSuggestion'].includes(f.route) && (!conns || conns.length === 0)) {
                Alert.alert('Add a connection first', 'Connect your person to unlock this feature.', [
                  { text: 'Not now', style: 'cancel' },
                  { text: 'Go to People', onPress: () => navigation.navigate('MainTabs', { screen: 'Connections' }) },
                ]);
                return;
              }
              navigation.navigate(f.route);
            }} style={[st.featureRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider }]}>
              <View style={[st.featureIcon, { backgroundColor: f.color + '12' }]}>
                <Feather name={f.icon} size={18} color={f.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <AppText variant="label">{f.label}</AppText>
                <AppText variant="caption" color="tertiary" style={{ marginTop: 2 }}>{f.desc}</AppText>
              </View>
              <Feather name="chevron-right" size={16} color={theme.text.tertiary} />
            </PressableScale>
          ))}
        </Card>

        {/* ── Quick Links ── */}
        <AppText variant="caption" color="tertiary" style={st.sectionLabel}>QUICK LINKS</AppText>
        <Card padded={false}>
          {QUICK_LINKS.map((q, i) => (
            <TouchableOpacity key={q.label} onPress={() => { haptics.light(); q.onPress(); }}
              style={[st.linkRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider }]} activeOpacity={0.7}>
              <Feather name={q.icon} size={16} color={theme.text.secondary} style={{ marginRight: 14 }} />
              <AppText variant="body" style={{ flex: 1 }}>{q.label}</AppText>
              <Feather name="chevron-right" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* ── Settings Row ── */}
        <PressableScale onPress={() => navigation.navigate('Settings')} style={st.settingsRow}>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[st.featureIcon, { backgroundColor: theme.text.primary + '08' }]}>
              <Feather name="settings" size={18} color={theme.text.primary} />
            </View>
            <AppText variant="label" style={{ flex: 1, marginLeft: 14 }}>Settings</AppText>
            <Feather name="chevron-right" size={16} color={theme.text.tertiary} />
          </Card>
        </PressableScale>

        {/* ── Appearance ── */}
        <AppText variant="caption" color="tertiary" style={st.sectionLabel}>APPEARANCE</AppText>
        <Card>
          <View style={st.themeRow}>
            {([['system', 'monitor', 'Auto'], ['light', 'sun', 'Light'], ['dark', 'moon', 'Dark']] as const).map(([mode, icon, label]) => {
              const active = themeMode === mode;
              return (
                <TouchableOpacity key={mode} onPress={() => setThemeMode(mode)} activeOpacity={0.8}
                  style={[st.themeBtn, { backgroundColor: active ? theme.accent.primary : isDark ? theme.bg.elevated : theme.bg.subtle }]}>
                  <Feather name={icon} size={20} color={active ? '#fff' : theme.text.secondary} />
                  <AppText variant="caption" style={{ marginTop: 6, fontWeight: active ? '700' : '500', color: active ? '#fff' : theme.text.secondary }}>{label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ── Data ── */}
        <AppText variant="caption" color="tertiary" style={st.sectionLabel}>DATA</AppText>
        <Button title={tr('Clear local data')} variant="danger" onPress={clearData} />
        <AppText variant="caption" color="tertiary" style={st.footer}>U&Me · v1.0{"\n"}Share schedules. Plan together.</AppText>
      </ScrollView>
    </KeyboardScreen>
  );
}

const st = StyleSheet.create({
  scroll: { paddingHorizontal: tokens.space.lg },

  // Identity
  identity: { alignItems: 'center', paddingVertical: 28, overflow: 'hidden' },
  identityGlow: { ...StyleSheet.absoluteFillObject, height: 120 },
  avatarRing: { borderWidth: 3, borderRadius: 54, padding: 3 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, gap: 8 },
  colorDot: { width: 32, height: 32, borderRadius: 11 },

  // XP
  xpCard: { marginTop: tokens.space.md },
  xpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  xpLabel: { letterSpacing: 0.8, fontWeight: '700', fontSize: 11, marginBottom: 2 },
  xpBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: tokens.radius.pill, backgroundColor: '#D9A56612' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, overflow: 'hidden' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginTop: tokens.space.md },
  statTile: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  // Sections
  sectionLabel: { letterSpacing: 1.0, fontWeight: '700', fontSize: 11, marginTop: 28, marginBottom: 12, marginLeft: 4 },

  // Features
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
  featureIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  // Links
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },

  // Settings
  settingsRow: { marginTop: tokens.space.md },

  // Theme
  themeRow: { flexDirection: 'row', gap: 12 },
  themeBtn: { flex: 1, height: 72, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },

  footer: { textAlign: 'center', marginTop: tokens.space.xxl, lineHeight: 18 },
});
