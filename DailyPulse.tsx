/**
 * OnboardingScreen — redesigned with warm editorial aesthetic.
 * Matches the app's terracotta/cream/sage design language.
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView,
  TouchableOpacity, View, StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId, setAuthenticatedUserId } from '../services/IdentityService';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import AppText from '../ui/components/AppText';
import Input from '../ui/components/Input';
import Avatar from '../ui/components/Avatar';
import { Logo } from '../ui/components/Logo';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import CalendarService from '../services/CalendarService';
import InviteService from '../services/InviteService';
import type { Connection } from '../types/connections';
import XPService from '../services/XPService';
import TutorialService from '../services/TutorialService';
import { logError } from '../services/logger';
import { todayKey } from '../utils/dateTime';
import { getFirstName } from '../utils/partners';
import type { ConnectionRelationship } from '../types/connections';
import { signUpWithEmail, loginWithEmail } from '../services/AuthService';
import { useTranslate } from '../i18n';

const { width: SCREEN_W } = Dimensions.get('window');

const USER_SETUP_KEY = '@uandme_user_setup_complete';
const USER_PROFILE_KEY = '@uandme_user_profile';
const COLORS = Object.entries(tokens.people).map(([id, color]) => ({ id, color }));
const REL_OPTIONS = [
  { id: 'partner', label: 'Partner', icon: 'heart' },
  { id: 'friend', label: 'Friend', icon: 'smile' },
  { id: 'family', label: 'Family', icon: 'home' },
  { id: 'colleague', label: 'Colleague', icon: 'briefcase' },
  { id: 'boyfriend', label: 'Boyfriend', icon: 'heart' },
  { id: 'girlfriend', label: 'Girlfriend', icon: 'heart' },
  { id: 'husband', label: 'Husband', icon: 'heart' },
  { id: 'wife', label: 'Wife', icon: 'heart' },
  { id: 'fiance', label: 'Fiancé', icon: 'heart' },
];
const QUICK_PLANS = [
  { emoji: '☕', label: 'Coffee', time: '10:00', dur: 30 },
  { emoji: '🍽️', label: 'Dinner', time: '19:00', dur: 90 },
  { emoji: '🎬', label: 'Movie', time: '20:00', dur: 120 },
  { emoji: '🏃', label: 'Walk', time: '17:30', dur: 45 },
  { emoji: '🍷', label: 'Wine', time: '20:30', dur: 60 },
  { emoji: '📞', label: 'Call', time: '18:00', dur: 15 },
];

const StepDot = memo(function StepDot({ active, theme }: { active: boolean; theme: Record<string, unknown> }) {
  return (
    <View style={{ width: active ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: active ? theme.accent.primary : theme.bg.subtle, marginHorizontal: 3 }} />
  );
});

export default function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tr = useTranslate();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [loading, setLoading] = useState(false);

  // Step 0 — Account + Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [authError, setAuthError] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  // Step 1
  const [personName, setPersonName] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [relationship, setRelationship] = useState<ConnectionRelationship>('partner');
  const [personColor, setPersonColor] = useState(COLORS[1]);

  // Step 2
  const [selectedPlan, setSelectedPlan] = useState<Record<string, unknown> | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [planDay, setPlanDay] = useState('tomorrow');
  const [createdConnection, setCreatedConnection] = useState<Record<string, unknown> | null>(null);

  const canProfile = useMemo(() => {
    const hasName = name.trim().length >= 2;
    const hasEmail = email.trim().length > 3 && email.includes('@');
    const hasPassword = password.length >= 6;
    if (authMode === 'login') return hasEmail && hasPassword;
    return hasName && hasEmail && hasPassword && password === confirmPassword;
  }, [name, email, password, confirmPassword, authMode]);

  const canInvite = useMemo(() => personName.trim().length >= 2, [personName]);
  const planTitle = selectedPlan?.label || customTitle.trim();

  const goTo = (nextStep: number) => {
    Keyboard.dismiss();
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const saveProfile = async () => {
    if (!canProfile) return;
    setLoading(true);
    setAuthError('');
    try {
      let uid: string;
      if (authMode === 'login') {
        const user = await loginWithEmail(email.trim(), password);
        uid = user.uid;
      } else {
        if (password !== confirmPassword) {
          setAuthError('Passwords don\'t match');
          setLoading(false);
          return;
        }
        const user = await signUpWithEmail({ email: email.trim(), password, displayName: name.trim() });
        uid = user.uid;
      }
      await setAuthenticatedUserId(uid);
      haptics.success();
      const profile = {
        id: uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        color: selectedColor.color,
        createdAt: Date.now(),
      };
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      goTo(1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setAuthError(msg.replace(/Firebase: /g, '').replace(/\(auth\/.*\)/, '').trim());
      haptics.error();
    } finally {
      setLoading(false);
    }
  };

  const saveConnection = async () => {
    if (!canInvite) return;
    haptics.success();
    const previewConnection: Connection = {
      id: `draft_${Date.now()}`,
      name: personName.trim(),
      email: personEmail.trim().toLowerCase() || '',
      color: personColor.color,
      relationship,
      level: 1, avatar: null,
      linkedVia: 'onboarding', createdAt: Date.now(),
      status: personEmail.trim() ? 'pending' : 'draft',
    };

    if (personEmail.trim()) {
      try {
        const invite = await InviteService.createInvite({ toEmail: personEmail.trim().toLowerCase(), toName: personName.trim(), relationship });
        previewConnection.linkedVia = invite.code;
        previewConnection.inviteId = invite.id;
      } catch (e) { logError('OnboardingScreen', e); }
    }

    setCreatedConnection(previewConnection);
    try { await XPService.awardXP(25, personEmail.trim() ? 'First invite sent! 💌' : 'Added your first person 💛'); } catch (e) { logError('OnboardingScreen', e); }
    goTo(2);
  };

  const skipInvite = () => { haptics.light(); goTo(2); };

  const finishWithPlan = async () => {
    if (!planTitle) return;
    setLoading(true);
    haptics.success();
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    const dateMap: Record<string, string> = {
      today: todayKey(),
      tomorrow: todayKey(tomorrow),
      weekend: (() => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + (day <= 6 ? 6 - day : 0)); return todayKey(d); })(),
      'next week': todayKey(nextWeek),
    };
    try {
      const sharedWith = createdConnection?.status === 'connected' ? [createdConnection.id] : [];
      await CalendarService.addEvent({
        title: planTitle,
        date: dateMap[planDay] || dateMap.tomorrow,
        time: selectedPlan?.time || '12:00',
        durationMinutes: selectedPlan?.dur || 60,
        description: createdConnection ? `With ${createdConnection.name}` : '',
        sharedWith,
        color: createdConnection?.color || theme.accent.primary,
      });
      try { await XPService.createEvent(sharedWith.length); } catch (e) { logError('OnboardingScreen', e); }
    } catch (e) { logError('OnboardingScreen', e); }
    await AsyncStorage.setItem(USER_SETUP_KEY, 'true');
    await TutorialService.queueFirstRunTutorial();
    try { await XPService.awardXP(30, 'Completed onboarding 🎉'); } catch (e) { logError('OnboardingScreen', e); }
    onComplete?.();
  };

  const finishWithout = async () => {
    setLoading(true);
    haptics.light();
    await AsyncStorage.setItem(USER_SETUP_KEY, 'true');
    await TutorialService.queueFirstRunTutorial();
    try { await XPService.awardXP(30, 'Completed onboarding 🎉'); } catch (e) { logError('OnboardingScreen', e); }
    onComplete?.();
  };

  const STEP_LABELS = [tr('Create account'), tr('Add someone'), tr('Plan a moment')];

  return (
    <View style={[s.root, { backgroundColor: theme.bg.base }]}>
      {/* ── Top progress bar ── */}
      <View style={[s.topBar, { paddingTop: insets.top + 12, borderBottomColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
        <View style={s.stepIndicator}>
          {STEP_LABELS.map((label, i) => (
            <View key={i} style={s.stepItem}>
              <View style={[
                s.stepCircle,
                {
                  backgroundColor: i < step ? theme.accent.primary : i === step ? theme.accent.primary : theme.bg.subtle,
                  borderColor: i <= step ? theme.accent.primary : theme.bg.subtle,
                }
              ]}>
                {i < step
                  ? <Feather name="check" size={12} color="#fff" />
                  : <AppText style={{ fontSize: 11, fontWeight: '700', color: i === step ? '#fff' : theme.text.tertiary }}>{i + 1}</AppText>
                }
              </View>
              {i < 2 && (
                <View style={[s.stepLine, { backgroundColor: i < step ? theme.accent.primary : theme.bg.subtle }]} />
              )}
            </View>
          ))}
        </View>
        <AppText variant="caption" color="tertiary" style={s.stepLabel}>
          {STEP_LABELS[step]}
        </AppText>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ══════════════════════════════════════
              STEP 0 — Create your account
          ══════════════════════════════════════ */}
          {step === 0 && (
            <View>
              {/* Hero */}
              <View style={s.hero}>
                <View style={[s.logoWrap, { backgroundColor: theme.accent.light }]}>
                  <Logo variant="mark" size={36} />
                </View>
                <AppText variant="title" style={[s.heroTitle, { color: theme.text.primary }]}>
                  {authMode === 'login' ? 'Welcome back' : 'Create your account'}
                </AppText>
                <AppText variant="body" color="secondary" style={s.heroSub}>
                  {authMode === 'login'
                    ? 'Log in to pick up where you left off.'
                    : 'Your shared space for plans, check-ins, and little moments that matter.'}
                </AppText>
              </View>

              {/* Account card */}
              <View style={[s.formCard, { backgroundColor: theme.bg.card, borderColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
                {authMode === 'signup' && (
                  <>
                    <AppText variant="label" color="secondary" style={s.fieldLabel}>Your name</AppText>
                    <Input
                      value={name}
                      onChangeText={setName}
                      placeholder="What people call you"
                      autoCapitalize="words"
                      autoFocus
                    />
                    <View style={s.spacer12} />
                  </>
                )}
                <AppText variant="label" color="secondary" style={s.fieldLabel}>Email</AppText>
                <Input
                  value={email}
                  onChangeText={(t) => { setEmail(t); setAuthError(''); }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus={authMode === 'login'}
                />
                <View style={s.spacer12} />
                <AppText variant="label" color="secondary" style={s.fieldLabel}>Password</AppText>
                <Input
                  value={password}
                  onChangeText={(t) => { setPassword(t); setAuthError(''); }}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  autoCapitalize="none"
                />
                {authMode === 'signup' && (
                  <>
                    <View style={s.spacer12} />
                    <AppText variant="label" color="secondary" style={s.fieldLabel}>Confirm password</AppText>
                    <Input
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); setAuthError(''); }}
                      placeholder="Re-type password"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </>
                )}
                {!!authError && (
                  <AppText variant="bodySm" style={{ color: '#C06B65', marginTop: 10 }}>{authError}</AppText>
                )}
              </View>

              {/* Colour picker — signup only */}
              {authMode === 'signup' && (
                <View style={[s.formCard, { backgroundColor: theme.bg.card, borderColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
                  <AppText variant="label" color="secondary" style={s.fieldLabel}>Your colour</AppText>
                  <View style={s.colorRow}>
                    {COLORS.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => { haptics.light(); setSelectedColor(c); }}
                        activeOpacity={0.8}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedColor.id === c.id }}
                        accessibilityLabel={`Colour ${c.id}`}
                        style={[
                          s.swatch,
                          { backgroundColor: c.color },
                          selectedColor.id === c.id && s.swatchActive,
                          selectedColor.id === c.id && { borderColor: c.color },
                        ]}
                      >
                        {selectedColor.id === c.id && (
                          <Feather name="check" size={14} color="#fff" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Preview pill — signup only */}
              {authMode === 'signup' && name.trim().length > 0 && (
                <View style={[s.previewPill, { backgroundColor: theme.bg.card, borderColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
                  <Avatar name={name} color={selectedColor.color} size={32} />
                  <AppText variant="body" style={[s.previewName, { color: theme.text.primary }]}>{name.trim()}</AppText>
                </View>
              )}

              <TouchableOpacity
                onPress={saveProfile}
                disabled={!canProfile || loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[s.primaryBtn, { backgroundColor: canProfile && !loading ? theme.accent.primary : theme.bg.subtle }]}
              >
                <AppText style={[s.primaryBtnText, { color: canProfile && !loading ? '#fff' : theme.text.tertiary }]}>
                  {loading ? (authMode === 'login' ? 'Logging in…' : 'Creating account…') : (authMode === 'login' ? 'Log in' : 'Create account')}
                </AppText>
                {!loading && <Feather name="arrow-right" size={18} color={canProfile ? '#fff' : theme.text.tertiary} style={s.ml8} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                activeOpacity={0.7}
                style={s.ghostBtn}
                accessibilityRole="button"
              >
                <AppText variant="bodySm" color="tertiary">
                  {authMode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
                </AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════
              STEP 1 — Who matters to you?
          ══════════════════════════════════════ */}
          {step === 1 && (
            <View>
              <View style={s.hero}>
                <View style={[s.stepIconWrap, { backgroundColor: theme.accent.light }]}>
                  <Feather name="user-plus" size={22} color={theme.accent.primary} />
                </View>
                <AppText variant="title" style={[s.heroTitle, { color: theme.text.primary }]}>
                  Who's this for?
                </AppText>
                <AppText variant="body" color="secondary" style={s.heroSub}>
                  U&Me works best between two people. Add the person you want to stay connected with.
                </AppText>
              </View>

              <View style={[s.formCard, { backgroundColor: theme.bg.card, borderColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
                <AppText variant="label" color="secondary" style={s.fieldLabel}>Their name</AppText>
                <Input
                  value={personName}
                  onChangeText={setPersonName}
                  placeholder="e.g. Sarah"
                  autoCapitalize="words"
                  autoFocus
                />
                <View style={s.spacer12} />
                <AppText variant="label" color="secondary" style={s.fieldLabel}>Their email <AppText variant="caption" color="tertiary">(optional)</AppText></AppText>
                <Input
                  value={personEmail}
                  onChangeText={setPersonEmail}
                  placeholder="Sends them an invite"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Relationship type */}
              <View style={[s.formCard, { backgroundColor: theme.bg.card, borderColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
                <AppText variant="label" color="secondary" style={s.fieldLabel}>They are your…</AppText>
                <View style={s.relRow}>
                  {REL_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => { haptics.light(); setRelationship(r.id as ConnectionRelationship); }}
                      activeOpacity={0.8}
                      style={[
                        s.relChip,
                        {
                          backgroundColor: relationship === r.id ? theme.accent.primary : theme.bg.subtle,
                          borderColor: relationship === r.id ? theme.accent.primary : 'transparent',
                        },
                      ]}
                    >
                      <Feather
                        name={r.icon as string}
                        size={12}
                        color={relationship === r.id ? '#fff' : theme.text.secondary}
                      />
                      <AppText style={{
                        fontSize: 12,
                        fontWeight: relationship === r.id ? '600' : '400',
                        color: relationship === r.id ? '#fff' : theme.text.secondary,
                        marginLeft: 5,
                      }}>
                        {r.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Colour */}
              <View style={[s.formCard, { backgroundColor: theme.bg.card, borderColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
                <AppText variant="label" color="secondary" style={s.fieldLabel}>Their colour</AppText>
                <View style={s.colorRow}>
                  {COLORS.filter((c) => c.id !== selectedColor.id).map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => { haptics.light(); setPersonColor(c); }}
                      activeOpacity={0.8}
                      style={[
                        s.swatch,
                        { backgroundColor: c.color },
                        personColor.id === c.id && s.swatchActive,
                        personColor.id === c.id && { borderColor: c.color },
                      ]}
                    >
                      {personColor.id === c.id && (
                        <Feather name="check" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview */}
              {personName.trim().length > 0 && (
                <View style={[s.previewPill, { backgroundColor: theme.bg.card, borderColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
                  <Avatar name={personName} color={personColor.color} size={32} />
                  <View style={{ marginLeft: 10 }}>
                    <AppText variant="body" style={{ color: theme.text.primary, fontWeight: '600' }}>{personName.trim()}</AppText>
                    <AppText variant="caption" color="tertiary" style={{ textTransform: 'capitalize' }}>{relationship}</AppText>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={saveConnection}
                disabled={!canInvite}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[s.primaryBtn, { backgroundColor: canInvite ? theme.accent.primary : theme.bg.subtle }]}
              >
                <AppText style={[s.primaryBtnText, { color: canInvite ? '#fff' : theme.text.tertiary }]}>
                  Continue
                </AppText>
                <Feather name="arrow-right" size={18} color={canInvite ? '#fff' : theme.text.tertiary} style={s.ml8} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={skipInvite}
                activeOpacity={0.7}
                style={s.ghostBtn}
                accessibilityRole="button"
              >
                <AppText variant="bodySm" color="tertiary">Skip for now</AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════
              STEP 2 — Plan your first moment
          ══════════════════════════════════════ */}
          {step === 2 && (
            <View>
              <View style={s.hero}>
                <View style={[s.stepIconWrap, { backgroundColor: theme.accent.light }]}>
                  <Feather name="calendar" size={22} color={theme.accent.primary} />
                </View>
                <AppText variant="title" style={[s.heroTitle, { color: theme.text.primary }]}>
                  Plan your first moment
                </AppText>
                <AppText variant="body" color="secondary" style={s.heroSub}>
                  {createdConnection
                    ? `What should you and ${getFirstName(createdConnection.name)} do?`
                    : 'What do you want to make time for?'}
                </AppText>
              </View>

              {/* Quick picks grid */}
              <View style={s.quickGrid}>
                {QUICK_PLANS.map((plan) => {
                  const active = selectedPlan?.label === plan.label;
                  return (
                    <TouchableOpacity
                      key={plan.label}
                      onPress={() => { haptics.light(); setSelectedPlan(active ? null : plan); setCustomTitle(''); }}
                      activeOpacity={0.8}
                      style={[
                        s.quickCard,
                        {
                          backgroundColor: active ? theme.accent.light : theme.bg.card,
                          borderColor: active ? theme.accent.primary : theme.divider || 'rgba(0,0,0,0.08)',
                        },
                      ]}
                    >
                      <AppText style={s.quickEmoji}>{plan.emoji}</AppText>
                      <AppText style={{
                        fontSize: 13,
                        fontWeight: active ? '700' : '500',
                        color: active ? theme.accent.primary : theme.text.primary,
                        marginTop: 4,
                      }}>
                        {plan.label}
                      </AppText>
                      <AppText style={{ fontSize: 10, color: theme.text.tertiary, marginTop: 2 }}>{plan.time}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom */}
              <View style={[s.formCard, { backgroundColor: theme.bg.card, borderColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
                <AppText variant="label" color="secondary" style={s.fieldLabel}>Or type your own</AppText>
                <Input
                  value={customTitle}
                  onChangeText={(t) => { setCustomTitle(t); setSelectedPlan(null); }}
                  placeholder="Yoga class, shopping, just hang out…"
                />
              </View>

              {/* When */}
              <View style={[s.formCard, { backgroundColor: theme.bg.card, borderColor: theme.divider || 'rgba(0,0,0,0.06)' }]}>
                <AppText variant="label" color="secondary" style={s.fieldLabel}>When</AppText>
                <View style={s.whenRow}>
                  {['today', 'tomorrow', 'weekend', 'next week'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => { haptics.light(); setPlanDay(d); }}
                      activeOpacity={0.8}
                      style={[
                        s.whenChip,
                        {
                          backgroundColor: planDay === d ? theme.accent.primary : theme.bg.subtle,
                          borderColor: planDay === d ? theme.accent.primary : 'transparent',
                        },
                      ]}
                    >
                      <AppText style={{
                        fontSize: 12,
                        fontWeight: planDay === d ? '700' : '400',
                        color: planDay === d ? '#fff' : theme.text.secondary,
                        textTransform: 'capitalize',
                      }}>
                        {d}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview event */}
              {planTitle ? (
                <View style={[s.eventPreview, { backgroundColor: theme.accent.light, borderLeftColor: createdConnection?.color || theme.accent.primary }]}>
                  <View style={s.eventPreviewRow}>
                    {createdConnection && <Avatar name={createdConnection.name} color={createdConnection.color} size={28} />}
                    <View style={{ marginLeft: createdConnection ? 10 : 0, flex: 1 }}>
                      <AppText variant="label" style={{ color: theme.text.primary }}>{planTitle}</AppText>
                      <AppText variant="caption" color="secondary" style={{ textTransform: 'capitalize' }}>
                        {planDay}{createdConnection ? ` · with ${getFirstName(createdConnection.name)}` : ''}
                      </AppText>
                    </View>
                    <Feather name="calendar" size={16} color={theme.accent.primary} />
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={finishWithPlan}
                disabled={!planTitle || loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[s.primaryBtn, { backgroundColor: planTitle && !loading ? theme.accent.primary : theme.bg.subtle }]}
              >
                <AppText style={[s.primaryBtnText, { color: planTitle && !loading ? '#fff' : theme.text.tertiary }]}>
                  {loading ? 'Setting up…' : "Let's go"}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={finishWithout}
                disabled={loading}
                activeOpacity={0.7}
                style={s.ghostBtn}
                accessibilityRole="button"
              >
                <AppText variant="bodySm" color="tertiary">Skip — I'll plan later</AppText>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // Top bar
  topBar: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 40,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 4,
  },
  stepLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },

  // Scroll
  scroll: {
    padding: tokens.space.lg,
    paddingTop: tokens.space.xl,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroSub: {
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 22,
  },

  // Form card
  formCard: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: 18,
    marginBottom: tokens.space.md,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  spacer12: { height: 12 },

  // Colours
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },

  // Preview pill
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  previewName: {
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 15,
  },

  // Relationship chips
  relRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  relChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
  },

  // Quick plan grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: tokens.space.md,
  },
  quickCard: {
    width: (Dimensions.get('window').width - tokens.space.lg * 2 - 16) / 3 - 6,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: tokens.radius.md,
    borderWidth: 1.5,
  },
  quickEmoji: { fontSize: 26 },

  // When chips
  whenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  whenChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
  },

  // Event preview
  eventPreview: {
    borderRadius: tokens.radius.md,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 16,
  },
  eventPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: tokens.radius.lg,
    marginBottom: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ml8: { marginLeft: 8 },
  ghostBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 4,
  },
});
