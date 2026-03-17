import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import Screen from './Screen';

/**
 * Screen wrapper that handles keyboard avoidance.
 * Drop-in replacement for <Screen> on any screen with text inputs.
 */
export default function KeyboardScreen({ children, style, keyboardVerticalOffset = 0 }: { children: React.ReactNode; style?: object; keyboardVerticalOffset?: number }) {
  return (
    <Screen style={style}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {children}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
