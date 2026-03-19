import React, { useCallback } from 'react';
import { Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Card from '../../../ui/components/Card';
import AppText from '../../../ui/components/AppText';
import Button from '../../../ui/components/Button';
import { useAppTheme } from '../../../ui/theme/ThemeProvider';
import { haptics } from '../../../ui/haptics';
import InviteService from '../../../services/InviteService';

export default function ShareCodeCard(props: Record<string, unknown>) {
  const { shareCode } = props;
  const { theme } = useAppTheme();

  const copyCode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(String(shareCode || ''));
      haptics.success();
    } catch {
      haptics.error();
    }
  }, [shareCode]);

  const copyLink = useCallback(async () => {
    try {
      const link = `uandme://join/${shareCode}`;
      await Clipboard.setStringAsync(link);
      haptics.success();
    } catch {
      haptics.error();
    }
  }, [shareCode]);

  const shareVia = useCallback(async () => {
    try {
      const message = InviteService.buildShareMessage(shareCode, 'I');
      await Share.share({ message });
      haptics.light();
    } catch {
      haptics.error();
    }
  }, [shareCode]);

  return (
    <Card style={{ borderColor: theme.divider }}>
      <AppText variant="title" numberOfLines={2} style={{ color: theme.text.primary, marginBottom: 6 }}>
        Your share code
      </AppText>
      <AppText variant="label" style={{ color: theme.text.secondary, marginBottom: 14 }}>
        They can enter this to connect with you.
      </AppText>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.divider,
          backgroundColor: theme.bg.default,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 14,
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <AppText
          style={{
            color: theme.accent.primary,
            fontSize: 32,
            fontWeight: '800',
            letterSpacing: 2,
          }}
        >
          {String(shareCode || '------')}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Copy code" variant="secondary" onPress={copyCode} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Copy link" variant="secondary" onPress={copyLink} />
        </View>
      </View>

      <Button title="Share via…" onPress={shareVia} />
    </Card>
  );
}
