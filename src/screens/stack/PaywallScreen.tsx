import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE } from '../../ui/theme/tokens';
import { useSubscription } from '../../app/context/SubscriptionContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = StackNavigationProp<RootStackParamList>;

// ─── Feature rows ─────────────────────────────────────────────────────────────

interface Feature {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'people',
    title: 'Unlimited connections',
    description: 'Share calendars with your partner, family, and close friends — no cap.',
  },
  {
    icon: 'bar-chart',
    title: 'Weekly activity reports',
    description: 'See trends, shared events, and how your week shaped up at a glance.',
  },
  {
    icon: 'cloud-done',
    title: 'Task sync across devices',
    description: 'Your to-do list follows you everywhere — phone, tablet, new device.',
  },
  {
    icon: 'heart',
    title: 'Priority support',
    description: 'Get faster responses when you need help from our team.',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PaywallScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top, bottom } = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const { isPremium, isLoading, purchasePremium, restorePurchases } = useSubscription();

  // If user somehow lands here already premium, just go back.
  const handleUpgrade = async () => {
    if (isPremium) { nav.goBack(); return; }
    await purchasePremium();
    // If purchase succeeded, isPremium will become true via the listener.
    if (isPremium) nav.goBack();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottom + SPACING.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient */}
        <LinearGradient
          colors={theme.gradient.primary}
          style={[styles.hero, { paddingTop: top + SPACING.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => nav.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={PALETTE.white} />
          </TouchableOpacity>

          <Text style={styles.crown}>👑</Text>
          <Text style={styles.heroTitle}>U&Me Plus</Text>
          <Text style={styles.heroSubtitle}>
            Stay connected without limits
          </Text>
        </LinearGradient>

        {/* Feature list */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>
            EVERYTHING IN PLUS
          </Text>
          <View style={[styles.featuresCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
            {FEATURES.map((f, i) => (
              <React.Fragment key={f.title}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />}
                <View style={styles.featureRow}>
                  <View style={[styles.featureIconWrap, { backgroundColor: `${theme.primary}18` }]}>
                    <Ionicons name={f.icon} size={20} color={theme.primary} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: theme.text.primary }]}>{f.title}</Text>
                    <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>{f.description}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Pricing note */}
        <View style={styles.pricingSection}>
          <Text style={[styles.pricingNote, { color: theme.text.tertiary }]}>
            Subscription auto-renews. Cancel anytime in your App Store / Play Store settings.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed CTA area */}
      <View style={[styles.ctaArea, { backgroundColor: theme.bg.default, borderTopColor: theme.border.default }]}>
        <TouchableOpacity
          onPress={handleUpgrade}
          disabled={isLoading}
          activeOpacity={0.85}
          accessibilityLabel="Get U&Me Plus"
          accessibilityRole="button"
          style={styles.ctaBtn}
        >
          <LinearGradient
            colors={theme.gradient.primary}
            style={styles.ctaBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color={PALETTE.white} />
            ) : (
              <>
                <Ionicons name="crown" size={18} color={PALETTE.white} />
                <Text style={styles.ctaBtnText}>
                  {isPremium ? 'Already subscribed ✓' : 'Get U&Me Plus'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={restorePurchases}
          disabled={isLoading}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          accessibilityLabel="Restore purchases"
          accessibilityRole="button"
        >
          <Text style={[styles.restoreText, { color: theme.text.tertiary }]}>
            Restore purchases
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    alignItems: 'center',
    paddingBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.screen,
    gap: SPACING.sm,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 0,        // will be offset by paddingTop on hero
    right: SPACING.screen,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    // Push the button down so it aligns with safe area top offset
    marginTop: SPACING.xl,
  },
  crown: { fontSize: 56, marginTop: SPACING.md },
  heroTitle: { ...TYPOGRAPHY.title, color: PALETTE.white },
  heroSubtitle: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  featuresSection: { paddingHorizontal: SPACING.screen, marginTop: SPACING.xl },
  sectionLabel: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  featuresCard: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  divider: { height: 1, marginLeft: SPACING.md + 40 + SPACING.md },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: { ...TYPOGRAPHY.bodyBold, marginBottom: 2 },
  featureDesc: { ...TYPOGRAPHY.caption },
  pricingSection: {
    paddingHorizontal: SPACING.screen,
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  pricingNote: { ...TYPOGRAPHY.caption, textAlign: 'center', lineHeight: 18 },
  ctaArea: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    gap: SPACING.md,
    alignItems: 'center',
  },
  ctaBtn: { width: '100%', borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOW.md },
  ctaBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  ctaBtnText: { ...TYPOGRAPHY.subheading, color: PALETTE.white },
  restoreText: { ...TYPOGRAPHY.caption },
});
