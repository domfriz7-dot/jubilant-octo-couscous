import { useState, useEffect } from 'react';
import { reportError } from '../../utils/reportError';
import { ensureUserProfile } from '../../services/InvitationService';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface BootstrapAuthResult {
  /** Whether Firebase Auth is configured (env key present). */
  enabled: boolean;
  /** True once the initial auth state has been determined. */
  ready: boolean;
  /** The current authenticated user, or null if not signed in. */
  user: AuthUser | null;
}

export default function useBootstrapAuth(): BootstrapAuthResult {
  const firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const enabled = Boolean(firebaseApiKey);

  const [ready, setReady] = useState(!enabled);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        const auth = getAuth();
        unsub = onAuthStateChanged(
          auth,
          async (firebaseUser) => {
            if (firebaseUser) {
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              });

              // Upsert /users/{uid} so other users can look this person up by
              // UID (invitation resolution, push-token storage). Fire-and-forget.
              ensureUserProfile(
                firebaseUser.uid,
                firebaseUser.email,
                firebaseUser.displayName
              ).catch((e) => reportError('useBootstrapAuth.ensureProfile', e));
            } else {
              setUser(null);
            }
            setReady(true);
          },
          (err) => {
            reportError('useBootstrapAuth', err);
            setReady(true);
          }
        );
      } catch (e) {
        reportError('useBootstrapAuth.init', e);
        setReady(true);
      }
    })();
    return () => unsub?.();
  }, [enabled]);

  return { enabled, ready, user };
}
