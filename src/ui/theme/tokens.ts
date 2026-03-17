// ─── Design Tokens ───────────────────────────────────────────────────────────
// Single source of truth for every visual value used across the app.
// Screens and components must only reference values from this file (via the
// theme object returned by useAppTheme) — never hard-code raw colours or sizes.

export const PALETTE = {
  // Brand
  indigo50: '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo300: '#A5B4FC',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  purple400: '#A78BFA',
  purple500: '#8B5CF6',
  purple600: '#7C3AED',
  purple700: '#6D28D9',
  // Semantic
  green400: '#34D399',
  green500: '#10B981',
  green600: '#059669',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  grey50: '#F9FAFB',
  grey100: '#F3F4F6',
  grey200: '#E5E7EB',
  grey300: '#D1D5DB',
  grey400: '#9CA3AF',
  grey500: '#6B7280',
  grey600: '#4B5563',
  grey700: '#374151',
  grey800: '#1F2937',
  grey900: '#111827',
  // Dark backgrounds
  dark50: '#1E2040',
  dark100: '#16213E',
  dark200: '#1A1A2E',
  dark300: '#151528',
  dark400: '#0F0F1A',
  dark500: '#0A0A14',
};

export type ThemeColors = typeof LIGHT_THEME;

export const LIGHT_THEME = {
  // Backgrounds
  bg: {
    default: PALETTE.white,
    subtle: PALETTE.grey50,
    card: PALETTE.white,
    elevated: PALETTE.grey100,
    overlay: 'rgba(0,0,0,0.5)',
  },
  // Text
  text: {
    primary: PALETTE.grey900,
    secondary: PALETTE.grey500,
    tertiary: PALETTE.grey400,
    inverse: PALETTE.white,
    accent: PALETTE.indigo600,
    danger: PALETTE.red500,
    success: PALETTE.green500,
  },
  // Borders
  border: {
    default: PALETTE.grey200,
    subtle: PALETTE.grey100,
    accent: PALETTE.indigo600,
    danger: PALETTE.red400,
  },
  // Brand
  primary: PALETTE.indigo600,
  primaryLight: PALETTE.indigo500,
  primaryDark: PALETTE.indigo700,
  secondary: PALETTE.purple600,
  secondaryLight: PALETTE.purple500,
  // Status
  success: PALETTE.green500,
  warning: PALETTE.amber500,
  danger: PALETTE.red500,
  info: PALETTE.blue500,
  // Gradient stops (used with expo-linear-gradient)
  gradient: {
    primary: [PALETTE.indigo600, PALETTE.purple600] as string[],
    success: [PALETTE.green500, PALETTE.green600] as string[],
    warm: [PALETTE.amber400, PALETTE.red500] as string[],
  },
  // Tab / icon
  tabActive: PALETTE.indigo600,
  tabInactive: PALETTE.grey400,
  // Input
  inputBg: PALETTE.grey50,
  inputBorder: PALETTE.grey200,
  inputBorderFocus: PALETTE.indigo600,
  // Shadow (iOS)
  shadowColor: PALETTE.black,
};

export const DARK_THEME: ThemeColors = {
  bg: {
    default: PALETTE.dark400,
    subtle: PALETTE.dark300,
    card: PALETTE.dark200,
    elevated: PALETTE.dark100,
    overlay: 'rgba(0,0,0,0.7)',
  },
  text: {
    primary: PALETTE.grey50,
    secondary: PALETTE.grey400,
    tertiary: PALETTE.grey500,
    inverse: PALETTE.grey900,
    accent: PALETTE.indigo300,
    danger: PALETTE.red400,
    success: PALETTE.green400,
  },
  border: {
    default: '#2D2D44',
    subtle: '#1E1E30',
    accent: PALETTE.indigo300,
    danger: PALETTE.red500,
  },
  primary: PALETTE.indigo500,
  primaryLight: PALETTE.indigo300,
  primaryDark: PALETTE.indigo600,
  secondary: PALETTE.purple500,
  secondaryLight: PALETTE.purple400,
  success: PALETTE.green400,
  warning: PALETTE.amber400,
  danger: PALETTE.red400,
  info: PALETTE.blue400,
  gradient: {
    primary: [PALETTE.indigo600, PALETTE.purple700] as string[],
    success: [PALETTE.green500, PALETTE.green600] as string[],
    warm: [PALETTE.amber400, PALETTE.red500] as string[],
  },
  tabActive: PALETTE.indigo300,
  tabInactive: PALETTE.grey600,
  inputBg: PALETTE.dark100,
  inputBorder: '#2D2D44',
  inputBorderFocus: PALETTE.indigo300,
  shadowColor: PALETTE.black,
};

// ─── Typography ──────────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  hero: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40 },
  title: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  heading: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  subheading: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  captionBold: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.5 },
};

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screen: 20, // consistent horizontal screen padding
};

// ─── Border Radius ───────────────────────────────────────────────────────────

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
};

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const SHADOW = {
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ─── Event Colour Palette ────────────────────────────────────────────────────
// 8 distinct colours for user-assigned event colours.

export const EVENT_COLORS = [
  '#4F46E5', // indigo
  '#7C3AED', // purple
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#3B82F6', // blue
  '#EC4899', // pink
  '#14B8A6', // teal
];
