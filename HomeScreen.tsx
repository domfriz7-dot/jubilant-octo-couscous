import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import SmartList from '../../../ui/components/SmartList';
import Card from '../../../ui/components/Card';
import AppText from '../../../ui/components/AppText';
import EmptyState from '../../../ui/components/EmptyState';
import { useAppTheme } from '../../../ui/theme/ThemeProvider';

const Row = React.memo(function Row({ item, onRemove }) {
  const { theme } = useAppTheme();
  return (
    <Card style={{ borderColor: theme.divider, paddingVertical: 14, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.bg.default,
            borderWidth: 1,
            borderColor: theme.divider,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <AppText style={{ fontSize: 18 }}>👤</AppText>
        </View>

        <View style={{ flex: 1 }}>
          <AppText style={{ color: theme.text.primary, fontWeight: '800' }} numberOfLines={1}>
            {item.name}
          </AppText>
          <AppText variant="label" style={{ color: theme.text.secondary, marginTop: 2 }} numberOfLines={1}>
            {item.email}
          </AppText>
        </View>

        <TouchableOpacity onPress={() => onRemove(item.id)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`}>
          <AppText style={{ color: theme.text.tertiary, fontSize: 22 }}>×</AppText>
        </TouchableOpacity>
      </View>
    </Card>
  );
});

export default function ConnectionsList(props: Record<string, unknown>) {
  const { connections, onRemove } = props;
  const { theme } = useAppTheme();

  if (!connections || connections.length === 0) {
    return (
      <EmptyState
        title="No connections yet"
        message="Share your code or connect using theirs."
        icon="👥"
      />
    );
  }

  return (
    <View>
      <AppText variant="title" numberOfLines={2} style={{ color: theme.text.primary, marginBottom: 10 }}>
        Connected ({connections.length})
      </AppText>

      <SmartList
        data={connections}
        keyExtractor={(item: { id: string }) => String(item.id)}
        estimatedItemSize={78}
        renderItem={({ item }) => <Row item={item} onRemove={onRemove} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        scrollEnabled={false}
      />
    </View>
  );
}
