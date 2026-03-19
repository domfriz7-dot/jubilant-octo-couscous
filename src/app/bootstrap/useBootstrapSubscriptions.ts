import { useEffect } from 'react';
import { reportError } from '../../utils/reportError';

export default function useBootstrapSubscriptions(): void {
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
    if (!apiKey) return;
    (async () => {
      try {
        const Purchases = await import('react-native-purchases');
        Purchases.default.configure({ apiKey });
      } catch (e) {
        reportError('useBootstrapSubscriptions', e);
      }
    })();
  }, []);
}
