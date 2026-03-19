import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeProvider, useAppTheme } from './ThemeProvider';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { logError } from '../../services/logger';

class Boundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) {
    logError('ErrorBoundary', error, { componentStack: info?.componentStack });
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <ThemeProvider>
        <Fallback onReset={() => this.setState({ hasError: false, error: null })} error={this.state.error} />
      </ThemeProvider>
    );
  }
}

function Fallback({ onReset, error }: { onReset: () => void; error: Error | null }) {
  const { theme } = useAppTheme();
  const reload = async () => {
    try {
      // Prefer a hard reload when available (Expo / dev builds). Kept dynamic to avoid bundling issues.
      const Updates = require('expo-updates');
      if (Updates?.reloadAsync) {
        await Updates.reloadAsync();
        return;
      }
    } catch (_) {
      // ignore
      // Intentionally ignored — non-critical failure
    }
    // Fallback: just reset the boundary state.
    onReset();
  };
  return (
    <View style={[s.container, { backgroundColor: theme.bg.default }]}>
      <AppText variant="title" style={{ marginBottom: 8 }}>We hit a snag</AppText>
      <AppText color="secondary" style={{ marginBottom: 16 }}>
        Please check your connection and try again. If it keeps happening, reload the app.
      </AppText>
      {__DEV__ && error ? <AppText variant="caption" color="muted" style={{ marginBottom: 16 }}>{String(error)}</AppText> : null}
      <View style={{ gap: 10 }}>
        <Button title="Try again" onPress={onReset} />
        <Button title="Reload app" variant="secondary" onPress={reload} />
      </View>
    </View>
  );
}

export default Boundary;
const s = StyleSheet.create({ container: { flex: 1, padding: 16, justifyContent: 'center' } });
