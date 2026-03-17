import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

import { subscribeAuthState } from '../../services/AuthService';
import { getFirebaseAuth } from '../../services/backend/firebaseClient';
import { clearAuthenticatedUserId, setAuthenticatedUserId } from '../../services/IdentityService';
import { logEvent } from '../../services/Telemetry';
import { reportError } from '../../utils/reportError';

export default function useBootstrapAuth() {
  const enabled = !!getFirebaseAuth();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let first = true;
    const unsub = subscribeAuthState(async (u) => {
      setUser(u);
      try {
        if (u?.uid) {
          await setAuthenticatedUserId(u.uid);
          logEvent('auth_state', { state: 'signed_in' });
        } else {
          await clearAuthenticatedUserId();
          logEvent('auth_state', { state: 'signed_out' });
        }
      } catch (e) { reportError('Bootstrap.Auth', e); // non-fatal
      } finally {
        if (first) {
          first = false;
          setReady(true);
        }
      }
    });
    return () => unsub?.();
  }, []);

  return { enabled, ready, user };
}
