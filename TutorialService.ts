import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebaseClient';
import { err, ok, Result } from '../../types/result';
import { getCurrentUserId } from '../IdentityService';

export type BackendStatus = {
  enabled: boolean;
  firebaseUid?: string;
};

let initOnce: Promise<Result<BackendStatus>> | null = null;

async function ensureUserDoc(firebaseUid: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const localId = getCurrentUserId();
  const ref = doc(db, 'users', firebaseUid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(
    ref,
    {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      localId,
      app: 'uandme',
    },
    { merge: true }
  );
}

/**
 * Initializes Firebase (if configured) + signs in anonymously.
 * This should NEVER block app boot.
 */
export function initBackend(): Promise<Result<BackendStatus>> {
  if (initOnce) return initOnce;

  initOnce = (async () => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) return ok({ enabled: false });

    try {
      // If the app already has a signed-in user (email/password, etc), do not interfere.
      if (!auth.currentUser) {
        try {
          // Anonymous auth is the safest default for "it should just work" boots.
          await signInAnonymously(auth);
        } catch (e: unknown) {
          // Common in Firebase projects where Anonymous auth is disabled.
          const code = typeof e?.code === 'string' ? e.code : '';
          const msg = typeof e?.message === 'string' ? e.message : String(e);
          if (code === 'auth/admin-restricted-operation' || msg.includes('auth/admin-restricted-operation')) {
            // Do NOT block the app. Backend features will be unavailable until a supported provider signs in.
            return ok({ enabled: false });
          }
          throw e;
        }
      }

      // Wait for auth state to settle (avoids edge-cases where currentUser is still null right after sign-in).
      const uid = await new Promise<string>((resolve, reject) => {
        const off = onAuthStateChanged(
          auth,
          (u) => {
            off();
            if (!u) reject(new Error('Firebase auth state has no user'));
            else resolve(u.uid);
          },
          (e) => {
            off();
            reject(e);
          }
        );
      });

      await ensureUserDoc(uid);

      return ok({ enabled: true, firebaseUid: uid });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return err(`Backend init failed: ${message}`, 'NETWORK', { cause: e });
    }
  })();

  return initOnce;
}
