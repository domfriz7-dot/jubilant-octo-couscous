import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Screen from '../../ui/components/Screen';
import AppText from '../../ui/components/AppText';
import Input from '../../ui/components/Input';
import Button from '../../ui/components/Button';
import Card from '../../ui/components/Card';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { signUpWithEmail } from '../../services/AuthService';
import { logEvent } from '../../services/Telemetry';
import { useTranslate } from '../../i18n';

export default function SignUpScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const tr = useTranslate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const okEmail = email.trim().length > 3;
    const okPass = password.length >= 6;
    const match = password === confirm;
    return okEmail && okPass && match;
  }, [email, password, confirm]);

  const onSignUp = async () => {
    if (!canSubmit) return;
    if (password !== confirm) {
      Alert.alert(tr('Passwords don’t match'), tr('Please re-type the same password.'));
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail({ email, password, displayName: name });
      logEvent('signup_success');
    } catch (e: unknown) {
      const msg = typeof e?.message === 'string' ? e.message : 'Check your connection and try again.';
      logEvent('signup_failed');
      Alert.alert(tr('Couldn’t create account'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <AppText variant="title" style={{ marginBottom: 6 }}>Create account</AppText>
          <AppText variant="body" color="secondary" style={{ marginBottom: 18 }}>
            Sign up to sync, invite your partner, and unlock Pro.
          </AppText>

          <Card style={{ padding: 16 }}>
            <Input
              label="Name (optional)"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <View style={{ height: 12 }} />
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
              placeholder="At least 6 characters"
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={{ height: 12 }} />
            <Input
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-type password"
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={{ height: 14 }} />
            <Button title={loading ? 'Creating…' : 'Create account'} onPress={onSignUp} disabled={!canSubmit || loading} />
          </Card>

          <View style={{ height: 16 }} />
          <Pressable onPress={() => navigation.goBack()}>
            <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Already have an account? <AppText variant="body" style={{ color: theme.accent.primary }}>Log in</AppText>
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
