import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE } from '../../ui/theme/tokens';
import { reportError } from '../../utils/reportError';
import { ensureUserProfile } from '../../services/InvitationService';

type Nav = StackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top, bottom } = useSafeAreaInsets();
  const nav = useNavigation<Nav>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    Keyboard.dismiss();
    setError('');
    setLoading(true);
    try {
      const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // updateProfile does NOT trigger onAuthStateChanged, so ensureUserProfile
      // in useBootstrapAuth will have run with null displayName by this point.
      // Update the Firebase user first, then re-sync the Firestore profile.
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
        ensureUserProfile(cred.user.uid, cred.user.email, name.trim(), null).catch(() => {});
      } catch (profileErr) {
        reportError('RegisterScreen.updateProfile', profileErr);
        // Non-fatal: the user is registered; displayName can be set later.
      }
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed. Please try again.');
      reportError('RegisterScreen', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg.default }]}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: top + SPACING.xxl, paddingBottom: bottom + SPACING.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={theme.gradient.primary}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.logoEmoji}>✨</Text>
          <Text style={styles.appName}>Create account</Text>
          <Text style={styles.tagline}>Join U&Me and share your world</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.md]}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${theme.danger}18`, borderColor: theme.danger }]}>
              <Text style={[styles.errorText, { color: theme.text.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.text.secondary }]}>Your name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text.primary }]}
            value={name}
            onChangeText={setName}
            placeholder="Alex"
            placeholderTextColor={theme.text.tertiary}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: theme.text.secondary }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text.primary }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: theme.text.secondary }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text.primary }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            placeholderTextColor={theme.text.tertiary}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={PALETTE.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => nav.goBack()} style={styles.switchRow}>
            <Text style={[styles.switchText, { color: theme.text.secondary }]}>
              Already have an account?{' '}
              <Text style={{ color: theme.text.accent }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.screen, gap: SPACING.xl },
  headerGradient: {
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.xxxl,
    gap: SPACING.sm,
  },
  logoEmoji: { fontSize: 52 },
  appName: { ...TYPOGRAPHY.heading, color: PALETTE.white },
  tagline: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  errorBox: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.md },
  errorText: { ...TYPOGRAPHY.caption },
  label: { ...TYPOGRAPHY.captionBold, marginBottom: -SPACING.xs },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body,
  },
  primaryButton: {
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { ...TYPOGRAPHY.bodyBold, color: PALETTE.white },
  switchRow: { alignItems: 'center', paddingTop: SPACING.xs },
  switchText: { ...TYPOGRAPHY.body, textAlign: 'center' },
});
