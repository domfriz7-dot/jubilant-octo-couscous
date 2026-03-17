/**
 * OfflineBanner — subtle top banner when device is offline.
 *
 * Appears below the safe area, auto-hides when connectivity returns.
 * Non-intrusive: doesn't block interaction, just informs.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AppText from './AppText';
import IconButton from './IconButton';

interface Props {
  visible: boolean;
  onRetry?: () => void;
}

export default function OfflineBanner({ visible, onRetry }: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={[s.container, { paddingTop: insets.top + 4 }]}>
      <View style={s.inner}>
        <Feather name="wifi-off" size={14} color="#FFF" />
        <AppText style={s.text}>You're offline — some features may be limited</AppText>
        {onRetry && (
          <IconButton accessibilityLabel="Retry" accessibilityHint="Retries the last request" onPress={onRetry}>
            <Feather name="refresh-cw" size={14} color="#FFF" />
          </IconButton>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#6B6259',
    zIndex: 999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});