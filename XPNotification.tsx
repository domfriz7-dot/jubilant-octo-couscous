import { useEffect } from 'react';
import { initSubscriptions } from '../../services/SubscriptionService';

export default function useBootstrapSubscriptions() {
  useEffect(() => {
    initSubscriptions().catch(() => {});
  }, []);
}
