import React, { useCallback } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';

import type { RootStackParamList } from '../navigation/types';

import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Divider from '../ui/components/Divider';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';

import { useShareCalendar } from './share/hooks/useShareCalendar';
import ShareCodeCard from './share/components/ShareCodeCard';
import AcceptCodeCard from './share/components/AcceptCodeCard';
import InviteEmailCard from './share/components/InviteEmailCard';
import ConnectionsList from './share/components/ConnectionsList';
import PrivacyNote from './share/components/PrivacyNote';

type Props = StackScreenProps<RootStackParamList, 'ShareCalendar'>;

export default function ShareCalendarScreen({ navigation, route }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const prefillCode = route?.params?.prefillCode;

  const { shareCode, acceptCode, setAcceptCode, inviteEmail, setInviteEmail, connections, isAcceptValid, accept, remove } =
    useShareCalendar({ prefillCode });

  const onAccept = useCallback(async () => {
    try {
      await accept();
      haptics.success();
    } catch (e) {
      haptics.error();
      Alert.alert('Could not connect', e?.message || 'Please try again.');
    }
  }, [accept]);

  const onRemove = useCallback(
    async (id: string) => {
      try {
        await remove(id);
        haptics.light();
      } catch {
        haptics.error();
      }
    },
    [remove]
  );

  return (
    <Screen padded={false}>
      <Header
        title="Share"
        subtitle="Invite and manage connections"
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: tokens.space.lg, paddingBottom: Math.max(insets.bottom, 24) + 140 }} showsVerticalScrollIndicator={false}>
        <ShareCodeCard shareCode={shareCode} />

                <AcceptCodeCard
          acceptCode={acceptCode}
          setAcceptCode={setAcceptCode}
          onAccept={onAccept}
          disabled={!isAcceptValid}
        />

                <InviteEmailCard inviteEmail={inviteEmail} setInviteEmail={setInviteEmail} shareCode={shareCode} />

                <ConnectionsList connections={connections} onRemove={onRemove} />

                <PrivacyNote />

        <Divider style={{ marginTop: 18 }} />
              </ScrollView>
    </Screen>
  );
}
