import React from 'react';
import Card from '../../../ui/components/Card';
import AppText from '../../../ui/components/AppText';
import { useAppTheme } from '../../../ui/theme/ThemeProvider';

export default function PrivacyNote() {
  const { theme } = useAppTheme();
  return (
    <Card style={{ borderColor: theme.divider, backgroundColor: theme.bg.surface }}>
      <AppText style={{ color: theme.text.secondary }}>
        🔒 When you share, others can see your event titles, dates and times.
        You can remove connections any time.
      </AppText>
    </Card>
  );
}
