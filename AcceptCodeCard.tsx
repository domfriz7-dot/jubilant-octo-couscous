import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Screen from '../../ui/components/Screen';
import AppText from '../../ui/components/AppText';
import Input from '../../ui/components/Input';
import Button from '../../ui/components/Button';
import Card from '../../ui/components/Card';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { loginWithEmail, requestPasswordReset } from '../../services/AuthService';
import { logEvent } from '../../services/Telemetry';
import { useTranslate } from '../../i18n';

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const tr = useTranslate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 6, [email, password]);

  const onLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      logEvent('login_success');
    } catch (e: unknown) {
      const msg = typeof e?.message === 'string' ? e.message : 'Check your connection and try again.';
      logEvent('login_failed');
      Alert.alert(tr('Couldn’t log in'), msg);
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    if (!email.trim()) {
      Alert.alert(tr('Enter your email'), tr('Type your email above first, then tap Reset Password.'));
      return;
    }
    try {
      await requestPasswordReset(email);
      logEvent('password_reset_requested');
      Alert.alert(tr('Check your inbox'), tr('We sent a password reset link.'));
    } catch (e: unknown) {
      const msg = typeof e?.message === 'string' ? e.message : 'Could not send reset email.';
      Alert.alert(tr('Reset failed'), msg);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <AppText variant="title" style={{ marginBottom: 6 }}>Welcome back</AppText>
          <AppText variant="body" color="secondary" style={{ marginBottom: 18 }}>
            Log in to sync your plans across devices.
          </AppText>

          <Card style={{ padding: 16 }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ height: 12 }} />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={{ height: 14 }} />
            <Button title={loading ? 'Logging in…' : 'Log in'} onPress={onLogin} disabled={!canSubmit || loading} />

            <View style={{ height: 10 }} />
            <Pressable onPress={onReset}>
              <AppText variant="caption" color="secondary" style={{ textAlign: 'center', textDecorationLine: 'underline' }}>
                Forgot password?
              </AppText>
            </Pressable>
          </Card>

          <View style={{ height: 16 }} />
          <Pressable onPress={() => navigation.navigate('SignUp')}>
            <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
              New here? <AppText variant="body" style={{ color: theme.accent.primary }}>Create an account</AppText>
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
