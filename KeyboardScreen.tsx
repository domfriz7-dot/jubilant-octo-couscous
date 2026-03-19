import React from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';
import { translateNode, useAppLanguage } from '../../i18n';

const t = tokens.type;
const variants = {
  // iOS can clip or look "messy" when lineHeight is missing on larger text.
  // Define explicit lineHeight for every variant to keep baseline + wrapping consistent.
  hero:    { fontSize: t.size.hero,  lineHeight: Math.round(t.size.hero * 1.12), fontWeight: t.weight.heavy,   letterSpacing: -1.0 },
  title:   { fontSize: t.size.xxl,   lineHeight: Math.round(t.size.xxl  * 1.12), fontWeight: t.weight.bold,    letterSpacing: -0.5 },
  h2:      { fontSize: t.size.xxl,   lineHeight: Math.round(t.size.xxl  * 1.15), fontWeight: t.weight.bold,    letterSpacing: -0.3 },
  h3:      { fontSize: t.size.xl,    lineHeight: Math.round(t.size.xl   * 1.2),  fontWeight: t.weight.semi,    letterSpacing: -0.1 },
  heading: { fontSize: t.size.xl,    lineHeight: Math.round(t.size.xl   * 1.18), fontWeight: t.weight.bold,    letterSpacing: -0.3 },
  body:    { fontSize: t.size.md,    lineHeight: Math.round(t.size.md   * 1.5),  fontWeight: t.weight.regular },
  bodySm:  { fontSize: t.size.sm,    lineHeight: Math.round(t.size.sm   * 1.4),  fontWeight: t.weight.regular },
  label:   { fontSize: t.size.sm,    lineHeight: Math.round(t.size.sm   * 1.2),  fontWeight: t.weight.semi,    letterSpacing: 0.1 },
  caption: { fontSize: t.size.xs,    lineHeight: Math.round(t.size.xs   * 1.2),  fontWeight: t.weight.medium },
  tiny:    { fontSize: 10,           lineHeight: 12,                          fontWeight: t.weight.semi,    letterSpacing: 0.4, textTransform: 'uppercase' },
};

const colorMap: Record<string, string> = {
  primary:   'primary',
  secondary: 'secondary',
  tertiary:  'tertiary',
  muted:     'tertiary',
  inverse:   'inverse',
};

export type AppTextVariant = keyof typeof variants;
export type AppTextColor = keyof typeof colorMap | string;
export type AppTextProps = {
  children?: React.ReactNode;
  variant?: AppTextVariant;
  color?: AppTextColor;
  style?: object | object[] | null;
  numberOfLines?: number;
  allowFontScaling?: boolean;
  [key: string]: unknown;
};

export default function AppText({ children, variant = 'body', color, style, numberOfLines, allowFontScaling = true, ...rest }: AppTextProps) {
  const { theme } = useAppTheme();
  const language = useAppLanguage();
  const textColor = color
    ? (theme.text[colorMap[color]] || theme.text[color] || color)
    : theme.text.primary;

  // If callers override fontSize inline (common for emoji, badges, etc.) but forget
  // to override lineHeight, iOS can clip or look messy. Auto-derive a safe lineHeight
  // in that case while keeping explicit lineHeight untouched.
  const styleFlat = StyleSheet.flatten(style) as Record<string, unknown> | undefined;
  const needsAutoLineHeight = !!styleFlat?.fontSize && (styleFlat?.lineHeight == null);
  const autoLineHeight = needsAutoLineHeight ? Math.round(Number(styleFlat.fontSize) * 1.25) : undefined;

  return (
    <Text
      style={[styles.base, variants[variant], { color: textColor }, needsAutoLineHeight ? { lineHeight: autoLineHeight } : null, style]}
      numberOfLines={numberOfLines}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={1.3}
      {...rest}
    >
      {translateNode(children, language)}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    // includeFontPadding is Android-only; keeping it on iOS can cause odd baseline/wrapping.
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    flexShrink: 1,
  },
});
