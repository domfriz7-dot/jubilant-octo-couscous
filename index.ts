import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';
import { useTranslate } from '../../i18n';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
};

export default function SearchBar({ value, onChangeText, placeholder = 'Search…', style }: SearchBarProps) {
  const { theme, isDark } = useAppTheme();
  const tr = useTranslate();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[st.wrap, { backgroundColor: isDark ? theme.bg.elevated : theme.bg.subtle, borderColor: focused ? theme.accent.primary + '50' : (theme.divider || theme.border) }, style]}>
      <Feather name="search" size={16} color={focused ? theme.accent.primary : theme.text.tertiary} style={{ marginRight: 10 }} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={typeof placeholder === 'string' ? tr(placeholder) : placeholder} placeholderTextColor={theme.text.tertiary}
        style={[st.input, { color: theme.text.primary }]} autoCapitalize="none" autoCorrect={false} returnKeyType="search"
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      {value?.length > 0 ? (
        <TouchableOpacity accessibilityRole="button" onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[st.clear, { backgroundColor: theme.text.tertiary + '20' }]}>
          <Feather name="x" size={12} color={theme.text.tertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
const st = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1 },
  input: { flex: 1, fontSize: tokens.type.size.md, paddingVertical: 0 },
  clear: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
});
