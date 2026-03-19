import { useState, useEffect } from 'react';
import { reportError } from '../../utils/reportError';
import { ensureUserProfile } from '../../services/InvitationService';
import { setAuthUid } from '../../services/IdentityService';
import NotificationService from '../../services/NotificationService';

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
              // Make getUserId() return the Firebase UID everywhere in the app
              setAuthUid(firebaseUser.uid);

              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              });

              // Upsert /users/{uid} including the current FCM push token so
              // Cloud Functions can deliver notifications to this device.
              const syncProfile = (token: string | null) => {
                ensureUserProfile(
                  firebaseUser.uid,
                  firebaseUser.email,
                  firebaseUser.displayName,
                  token
                ).catch((e) => reportError('useBootstrapAuth.ensureProfile', e));
              };

              // Sync immediately with whatever token is already available,
              // then re-sync whenever the token refreshes.
              syncProfile(NotificationService.getToken());
              NotificationService.onTokenRefresh((newToken) => syncProfile(newToken));
            } else {
              setAuthUid(null);
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
