import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, View, TextInput, StyleSheet, Animated, Easing } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import { tokens } from '../../config/tokens';
import { useTranslate } from '../../i18n';

export default function Input({ label, value, onChangeText, placeholder, autoCapitalize, keyboardType, secureTextEntry, style, inputStyle, multiline, autoFocus, maxLength, ...rest }: { label?: string; value?: string; onChangeText?: (t: string) => void; placeholder?: string; autoCapitalize?: string; keyboardType?: string; secureTextEntry?: boolean; style?: object; inputStyle?: object; multiline?: boolean; autoFocus?: boolean; maxLength?: number; [key: string]: unknown }) {
  const { theme, isDark } = useAppTheme();
  const tr = useTranslate();
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: false,
    }).start();
  }, [focused, borderAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.divider || theme.border, theme.accent.primary + '60'],
  });

  return (
    <View style={style}>
      {label ? (
        <AppText variant="caption" style={{
          color: focused ? theme.accent.primary : theme.text.secondary,
          marginBottom: 8,
          letterSpacing: 0.2,
          fontWeight: focused ? '600' : '500',
        }}>{typeof label === 'string' ? tr(label) : label}</AppText>
      ) : null}
      <Animated.View style={{
        borderWidth: 1.5,
        borderColor,
        borderRadius: tokens.radius.md,
        backgroundColor: isDark ? theme.bg.elevated : theme.bg.subtle,
      }}>
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={typeof placeholder === 'string' ? tr(placeholder) : placeholder}
          placeholderTextColor={theme.text.tertiary}
          autoCapitalize={autoCapitalize} keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline} autoFocus={autoFocus} maxLength={maxLength}
          onFocus={useCallback(() => setFocused(true), [])}
          onBlur={useCallback(() => setFocused(false), [])}
          style={[st.input, {
            color: theme.text.primary,
          },
            multiline && {
              minHeight: 110,
              paddingTop: Platform.OS === 'ios' ? 14 : 12,
              ...(Platform.OS === 'android' ? { textAlignVertical: 'top' as const } : null),
            },
            inputStyle,
          ]}
          {...rest}
        />
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: tokens.type.size.md,
    fontWeight: tokens.type.weight.regular,
  },
});
