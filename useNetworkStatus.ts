import React, { useMemo } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logError } from '../services/logger';

export type ScreenGetter = () => React.ComponentType<any>;

/**
 * ScreenErrorBoundary — catches render-time crashes PER SCREEN.
 *
 * Instead of the whole app dying, only the broken screen shows a fallback.
 * The user can tap "Go back" to navigate away or "Try again" to remount.
 */
class ScreenErrorBoundary extends React.Component<
  { children: React.ReactNode; navigation?: Record<string, unknown> },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode; navigation?: Record<string, unknown> }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message || String(error) };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    logError('ScreenErrorBoundary', error, {
      componentStack: info?.componentStack?.slice(0, 500),
    }).catch(() => {});
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const goBack = () => {
      try { this.props.navigation?.goBack?.(); } catch (e) { logError('ScreenErrorBoundary.goBack', e); }
    };
    const retry = () => this.setState({ hasError: false, error: '' });

    return (
      <View style={bStyles.container}>
        <Text style={bStyles.emoji}>😵</Text>
        <Text style={bStyles.title}>This screen hit a snag</Text>
        <Text style={bStyles.message}>
          Something went wrong loading this screen. Your data is safe.
        </Text>
        {__DEV__ && this.state.error ? (
          <Text style={bStyles.debug}>{this.state.error}</Text>
        ) : null}
        <View style={bStyles.actions}>
          <TouchableOpacity style={bStyles.btn} onPress={retry} activeOpacity={0.8}>
            <Text style={bStyles.btnText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[bStyles.btn, bStyles.btnSec]} onPress={goBack} activeOpacity={0.8}>
            <Text style={[bStyles.btnText, bStyles.btnTextSec]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const bStyles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F5' },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#252220', textAlign: 'center' },
  message: { fontSize: 14, color: '#6B6259', textAlign: 'center', lineHeight: 20, marginBottom: 16, maxWidth: 280 },
  debug: { fontSize: 11, color: '#9B9389', textAlign: 'center', marginBottom: 16, maxWidth: 300 },
  actions: { gap: 10, width: '100%', maxWidth: 240 },
  btn: { backgroundColor: '#B8897A', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnSec: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#C4BDB5' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  btnTextSec: { color: '#6B6259' },
});

/**
 * Wrap a sync require()-based screen getter with error boundary.
 * Each screen gets its own boundary — one crash doesn't kill the app.
 */
export function lazyScreen(getter: ScreenGetter): React.ComponentType<any> {
  return function LazyWrapped(props: Record<string, unknown>) {
    const Comp = useMemo(() => {
      try {
        return getter();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logError('lazyScreen.load', e, { message: msg }).catch(() => {});
        return function Fallback() {
          return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <Text style={{ fontWeight: '600', marginBottom: 8, fontSize: 16, lineHeight: 20 }}>Screen failed to load</Text>
              <Text style={{ textAlign: 'center', fontSize: 13, lineHeight: 18 }}>{msg}</Text>
            </View>
          );
        };
      }
    }, []);

    if (!Comp) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <ScreenErrorBoundary navigation={props.navigation}>
        <Comp {...props} />
      </ScreenErrorBoundary>
    );
  };
}
