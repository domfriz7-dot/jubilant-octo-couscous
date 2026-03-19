/**
 * SubscriptionContext
 *
 * Single source of truth for premium status. Initialises RevenueCat when an
 * API key is present, listens for customer-info updates, and exposes helpers
 * for purchasing and restoring subscriptions.
 *
 * When no API key is configured (local dev / CI) isPremium stays false and the
 * purchase/restore helpers show a graceful alert instead of crashing.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { reportError } from '../../utils/reportError';

const RC_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';
const RC_ENTITLEMENT = 'premium';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionContextValue {
  isPremium: boolean;
  isLoading: boolean;
  purchasePremium: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isPremium: false,
  isLoading: false,
  purchasePremium: async () => {},
  restorePurchases: async () => {},
});

export function useSubscription(): SubscriptionContextValue {
  return useContext(SubscriptionContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Keep a stable ref to Purchases so purchasePremium/restorePurchases don't
  // need to re-import every call.
  const PurchasesRef = useRef<any>(null);

  useEffect(() => {
    if (!RC_API_KEY) return;
    let alive = true;
    (async () => {
      try {
        const Purchases = await import('react-native-purchases');
        if (!alive) return;
        Purchases.default.configure({ apiKey: RC_API_KEY });
        PurchasesRef.current = Purchases.default;

        const info = await Purchases.default.getCustomerInfo();
        if (alive) setIsPremium(RC_ENTITLEMENT in (info.entitlements.active ?? {}));

        Purchases.default.addCustomerInfoUpdateListener((customerInfo) => {
          setIsPremium(RC_ENTITLEMENT in (customerInfo.entitlements.active ?? {}));
        });
      } catch (e) {
        reportError('SubscriptionContext.init', e);
      }
    })();
    return () => { alive = false; };
  }, []);

  const purchasePremium = useCallback(async () => {
    if (!RC_API_KEY) {
      Alert.alert(
        'Not available',
        'Subscriptions are not configured in this build. Please check back soon!'
      );
      return;
    }
    setIsLoading(true);
    try {
      const Purchases = PurchasesRef.current ?? (await import('react-native-purchases')).default;
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.[0];
      if (!pkg) {
        Alert.alert('No offerings', 'No subscription plans are available right now. Please try again later.');
        return;
      }
      await Purchases.purchasePackage(pkg);
      // Customer info listener will fire and update isPremium automatically.
    } catch (e: any) {
      if (e?.userCancelled) return;
      reportError('SubscriptionContext.purchase', e);
      Alert.alert('Purchase failed', 'Something went wrong. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    if (!RC_API_KEY) return;
    setIsLoading(true);
    try {
      const Purchases = PurchasesRef.current ?? (await import('react-native-purchases')).default;
      const info = await Purchases.restorePurchases();
      const active = RC_ENTITLEMENT in (info.entitlements.active ?? {});
      setIsPremium(active);
      Alert.alert(
        active ? 'Restored successfully' : 'Nothing to restore',
        active
          ? 'Your U&Me Plus subscription is active again.'
          : 'No active subscription was found for this Apple/Google account.'
      );
    } catch (e) {
      reportError('SubscriptionContext.restore', e);
      Alert.alert('Restore failed', 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <SubscriptionContext.Provider value={{ isPremium, isLoading, purchasePremium, restorePurchases }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
