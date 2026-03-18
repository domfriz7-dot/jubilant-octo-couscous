import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PALETTE, SPACING, TYPOGRAPHY, RADIUS } from './tokens';

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  State
> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children ?? null;
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>💔</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>{this.state.message || 'An unexpected error occurred.'}</Text>
        <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.dark400,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emoji: { fontSize: 48, marginBottom: SPACING.lg },
  title: {
    ...TYPOGRAPHY.heading,
    color: PALETTE.grey50,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  body: {
    ...TYPOGRAPHY.body,
    color: PALETTE.grey400,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  button: {
    backgroundColor: PALETTE.indigo600,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.full,
  },
  buttonText: { ...TYPOGRAPHY.bodyBold, color: PALETTE.white },
});
