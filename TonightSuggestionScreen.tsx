import React, { useCallback } from 'react';
import { Share } from 'react-native';
import Card from '../../../ui/components/Card';
import AppText from '../../../ui/components/AppText';
import Input from '../../../ui/components/Input';
import Button from '../../../ui/components/Button';
import { useAppTheme } from '../../../ui/theme/ThemeProvider';
import InviteService from '../../../services/InviteService';
import { haptics } from '../../../ui/haptics';

export default function InviteEmailCard(props: Record<string, unknown>) {
  const { inviteEmail, setInviteEmail, shareCode } = props;
  const { theme } = useAppTheme();

  const sendInvite = useCallback(async () => {
    const email = (inviteEmail || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      haptics.error();
      return;
    }

    try {
      // Local-only: record an invite (future backend-ready)
      // Record invite and share via system sheet
      const invite = await InviteService.createInvite({ toEmail: email });
      const message = InviteService.buildShareMessage(invite.code, 'I');
      await Share.share({ message });
      setInviteEmail('');
      haptics.success();
    } catch {
      haptics.error();
    }
  }, [inviteEmail, setInviteEmail, shareCode]);

  return (
    <Card style={{ borderColor: theme.divider }}>
      <AppText variant="title" numberOfLines={2} style={{ color: theme.text.primary, marginBottom: 6 }}>
        Invite via email
      </AppText>
      <AppText variant="label" style={{ color: theme.text.secondary, marginBottom: 14 }}>
        We\'ll open the share sheet with a message you can send.
      </AppText>

      <Input
        placeholder="friend@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={inviteEmail}
        onChangeText={setInviteEmail}
      />

      <Button title="Send invite" onPress={sendInvite} style={{ marginTop: 12 }} />
    </Card>
  );
}
