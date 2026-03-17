import React from 'react';
import Card from '../../../ui/components/Card';
import AppText from '../../../ui/components/AppText';
import Input from '../../../ui/components/Input';
import Button from '../../../ui/components/Button';
import { useAppTheme } from '../../../ui/theme/ThemeProvider';

export default function AcceptCodeCard(props: Record<string, unknown>) {
  const { acceptCode, setAcceptCode, onAccept, disabled } = props;
  const { theme } = useAppTheme();

  return (
    <Card style={{ borderColor: theme.divider }}>
      <AppText variant="title" numberOfLines={2} style={{ color: theme.text.primary, marginBottom: 6 }}>
        Connect with someone
      </AppText>
      <AppText variant="label" style={{ color: theme.text.secondary, marginBottom: 14 }}>
        Enter the invite code shared with you.
      </AppText>

      <Input
        placeholder="ABC123"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        value={acceptCode}
        onChangeText={(t: string) => setAcceptCode(String(t || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
      />

      <Button title="Connect" onPress={onAccept} disabled={disabled} style={{ marginTop: 12 }} />
    </Card>
  );
}
