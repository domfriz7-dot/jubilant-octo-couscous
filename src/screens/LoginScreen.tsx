import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE } from '../ui/theme/tokens';
import { reportError } from '../utils/reportError';

type Nav = StackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top, bottom } = useSafeAreaInsets();
  const nav = useNavigation<Nav>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(getAuth(), email.trim(), password);
      // Auth state change in useBootstrapAuth will handle navigation
    } catch (e: any) {
      setError(e?.message ?? 'Sign in failed. Please try again.');
      reportError('LoginScreen', e);
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
        {/* Header */}
        <LinearGradient
          colors={theme.gradient.primary}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.logoEmoji}>💑</Text>
          <Text style={styles.appName}>U&Me</Text>
          <Text style={styles.tagline}>Stay in sync with the people you love</Text>
        </LinearGradient>

        {/* Form card */}
        <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.md]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Sign in</Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${theme.danger}18`, borderColor: theme.danger }]}>
              <Text style={[styles.errorText, { color: theme.text.danger }]}>{error}</Text>
            </View>
          ) : null}

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
            placeholder="••••••••"
            placeholderTextColor={theme.text.tertiary}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={PALETTE.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => nav.navigate('Register')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.switchRow}
          >
            <Text style={[styles.switchText, { color: theme.text.secondary }]}>
              Don't have an account?{' '}
              <Text style={{ color: theme.text.accent }}>Sign up</Text>
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
  appName: { ...TYPOGRAPHY.hero, color: PALETTE.white },
  tagline: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  cardTitle: { ...TYPOGRAPHY.heading, marginBottom: SPACING.xs },
  errorBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
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
    backgroundColor: PALETTE.indigo600,
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
