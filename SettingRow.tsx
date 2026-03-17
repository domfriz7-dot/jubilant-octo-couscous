import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import Card from './Card';
import Skeleton from './Skeleton';
import { tokens } from '../../config/tokens';

type Props = {
  message?: string;
  count?: number;
  style?: object;
};

export default function LoadingState({ message, count = 3, style }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      {message ? (
        <AppText variant="body" color="secondary" style={styles.message}>
          {message}
        </AppText>
      ) : null}

      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} style={styles.card}>
          <Skeleton height={16} width="60%" style={styles.row} />
          <Skeleton height={12} width="85%" style={styles.row} />
          <Skeleton height={12} width="70%" />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.space.md, paddingHorizontal: tokens.space.lg },
  message: { marginBottom: tokens.space.sm },
  card: { padding: tokens.space.lg, gap: tokens.space.sm, backgroundColor: 'transparent' },
  row: { marginBottom: tokens.space.xs },
});
