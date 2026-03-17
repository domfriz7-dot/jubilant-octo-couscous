// src/config/tokens.ts — U&Me Premium Design System v2

const palette = {
  cream: '#FAF8F5', linen: '#F4F1ED', sand: '#E8E4DE', stone: '#C4BDB5',
  driftwood: '#9B9389', walnut: '#6B6259', charcoal: '#3A3530', espresso: '#252220',
  clay: '#B8897A', clayLight: '#CCBAB0', clayPale: '#F5EDEA', clayDark: '#917060',
  sage: '#6B9B7F', amber: '#D9A566', coral: '#C06B65', sky: '#7B93B3',
  ink: '#141312', soot: '#1C1B19', ash: '#262523', smoke: '#353330',
  fog: '#464340', pewter: '#8A857E', silver: '#B5AFA7',
};

const people = {
  clay: '#C17B6F', indigo: '#4F46E5', pink: '#EC4899', green: '#10B981',
  purple: '#8B5CF6', gold: '#F59E0B', teal: '#14B8A6', emerald: '#059669',
};

const tags = {
  indigo: '#4F46E5', pink: '#EC4899', green: '#10B981', gold: '#F59E0B',
  clay: '#C4A08E', slate: '#8B93A6', muted1: '#B8A99C', muted2: '#9B8B7E',
  muted3: '#8D9B9B', muted4: '#C9ADA7', muted5: '#A39080',
};

const priority = { high: palette.coral, med: palette.amber, low: palette.sage };
const streak = '#F59E0B';

const semantic = {
  default: {
    riskHigh: '#C06B65', riskMed: '#D9A566', riskLow: '#6B9B7F',
    scoreExcellent: '#6B9B7F', scoreGood: '#7B93B3', scoreFair: '#D9A566', scorePoor: '#C06B65',
    gradientPositive: ['#4A8B6B', '#6B9B7F'] as readonly [string, string],
    gradientNeutral: ['#7A5FC0', '#A78BFA'] as readonly [string, string],
    gradientWarm: ['#C48830', '#E8B86D'] as readonly [string, string],
    gradientUrgent: ['#B05048', '#E8695F'] as readonly [string, string],
  },
  dark: {
    riskHigh: '#E8695F', riskMed: '#E8B86D', riskLow: '#5DBF7B',
    scoreExcellent: '#5DBF7B', scoreGood: '#8BA3C4', scoreFair: '#E8B86D', scorePoor: '#E8695F',
    gradientPositive: ['#3A7B5B', '#5DBF7B'] as readonly [string, string],
    gradientNeutral: ['#6A4FB0', '#A78BFA'] as readonly [string, string],
    gradientWarm: ['#B47820', '#E8B86D'] as readonly [string, string],
    gradientUrgent: ['#A04038', '#E8695F'] as readonly [string, string],
  },
};

export const tokens = {
  palette, people, tags, priority, streak,
  colors: {
    default: {
      bg: { base: palette.cream, card: '#FFFFFF', elevated: '#FFFFFF', subtle: palette.linen },
      text: { primary: palette.espresso, secondary: palette.walnut, tertiary: palette.stone, inverse: '#FFFFFF' },
      accent: { primary: palette.clay, light: palette.clayPale, muted: palette.clayLight, dark: palette.clayDark },
      border: palette.sand, divider: '#EEEBE7', overlay: 'rgba(37,34,32,0.4)',
      success: palette.sage, warning: palette.amber, error: palette.coral, info: palette.sky,
    },
    dark: {
      bg: { base: palette.ink, card: palette.soot, elevated: palette.ash, subtle: palette.soot },
      text: { primary: '#F2EFEB', secondary: palette.silver, tertiary: palette.pewter, inverse: palette.ink },
      accent: { primary: '#D4BBB0', light: 'rgba(212,187,176,0.12)', muted: '#B89485', dark: '#E8CCC4' },
      border: palette.smoke, divider: '#2A2826', overlay: 'rgba(0,0,0,0.6)',
      success: '#5DBF7B', warning: '#E8B86D', error: '#E8695F', info: '#8BA3C4',
    },
  },
  type: {
    size: { xxs: 10, xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, hero: 34 },
    weight: { regular: '400', medium: '500', semi: '600', bold: '700', heavy: '800' },
    leading: { tight: 1.15, normal: 1.4, relaxed: 1.6 },
    tracking: { tight: -0.8, normal: -0.3, wide: 0.4, ultra: 1.0 },
  },
  space: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64, huge: 80 },
  radius: { sm: 10, md: 14, lg: 18, xl: 24, xxl: 32, pill: 999 },
  shadow: {
    sm: { shadowColor: '#1A1816', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
    md: { shadowColor: '#1A1816', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
    lg: { shadowColor: '#1A1816', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 6 },
    glow: (color: string, intensity = 0.2) => ({
      shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: intensity, shadowRadius: 16, elevation: 4,
    }),
  },
  motion: {
    quick: 120, normal: 220, slow: 350,
    spring: { tension: 200, friction: 18 },
    springBouncy: { tension: 300, friction: 14 },
    springGentle: { tension: 120, friction: 20 },
  },
  opacity: { hover: 0.65, pressed: 0.5, disabled: 0.38, overlay: 0.4, tint: { subtle: '06', light: '10', medium: '18', strong: '25' } },
  peopleArray: Object.values(people),
  tagsArray: Object.values(tags),
};

export const getTheme = (isDark = false) => {
  const b = isDark ? tokens.colors.dark : tokens.colors.default;
  const s = isDark ? semantic.dark : semantic.default;
  const sw = isDark ? 0.35 : 1;
  const shadow = {
    sm: { ...tokens.shadow.sm, shadowOpacity: tokens.shadow.sm.shadowOpacity * sw, elevation: isDark ? 2 : 1 },
    md: { ...tokens.shadow.md, shadowOpacity: tokens.shadow.md.shadowOpacity * sw, elevation: isDark ? 4 : 3 },
    lg: { ...tokens.shadow.lg, shadowOpacity: tokens.shadow.lg.shadowOpacity * sw, elevation: isDark ? 6 : 6 },
  };
  return {
    ...b, shadow, semantic: s,
    brand: { primary: b.accent.primary, primarySoft: b.accent.light, danger: b.error },
    text: { ...b.text, muted: b.text.tertiary },
    bg: { ...b.bg, default: b.bg.base, surface: b.bg.card, muted: b.divider },
    glass: isDark
      ? { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.07)' }
      : { bg: 'rgba(255,255,255,0.72)', border: 'rgba(0,0,0,0.03)' },
  };
};
