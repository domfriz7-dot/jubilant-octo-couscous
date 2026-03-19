/**
 * PremiumShareContext
 *
 * Tracks premium benefit sharing for the current user — both as a grantor
 * (purchaser who shared) and as a grantee (partner receiving the benefit).
 *
 * Maintains its own Firebase auth listener so it stays independent of
 * ConnectionsContext in the provider tree.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  PremiumShareRecord,
  setShare,
  removeShare,
  subscribeToOutgoingShare,
  subscribeToIncomingShare,
} from '../../services/PremiumShareService';
import { reportError } from '../../utils/reportError';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PremiumShareContextValue {
  /** Who the current user (purchaser) is sharing Plus with, or null. */
  outgoingShare: PremiumShareRecord | null;
  /** Who shared Plus with the current user, or null. */
  incomingShare: PremiumShareRecord | null;
  /** True if someone else's Plus subscription covers this user. */
  isSharedWithMe: boolean;
  /** Share Plus with a connected partner. */
  shareWith: (grantee: { uid: string; name: string; email: string }) => Promise<void>;
  /** Revoke sharing for the current grantee. */
  revokeShare: () => Promise<void>;
  isLoading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PremiumShareContext = createContext<PremiumShareContextValue>({
  outgoingShare: null,
  incomingShare: null,
  isSharedWithMe: false,
  shareWith: async () => {},
  revokeShare: async () => {},
  isLoading: false,
});

export function usePremiumShare(): PremiumShareContextValue {
  return useContext(PremiumShareContext);
}

/** True if the user holds their own subscription OR has been shared one. */
export function useIsPlus(ownPremium: boolean): boolean {
  const { isSharedWithMe } = usePremiumShare();
  return ownPremium || isSharedWithMe;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PremiumShareProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [uid, setUid] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('A partner');
  const [outgoingShare, setOutgoingShare] = useState<PremiumShareRecord | null>(null);
  const [incomingShare, setIncomingShare] = useState<PremiumShareRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const unsubOutRef = useRef<(() => void) | null>(null);
  const unsubInRef = useRef<(() => void) | null>(null);

  // Subscribe to both share directions whenever the current uid changes.
  useEffect(() => {
    if (!uid) {
      setOutgoingShare(null);
      setIncomingShare(null);
      return;
    }

    unsubOutRef.current?.();
    unsubInRef.current?.();

    unsubOutRef.current = subscribeToOutgoingShare(uid, setOutgoingShare);
    unsubInRef.current = subscribeToIncomingShare(uid, setIncomingShare);

    return () => {
      unsubOutRef.current?.();
      unsubInRef.current?.();
    };
  }, [uid]);

  // Own Firebase auth listener — independent of ConnectionsContext.
  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) return;
    let authUnsub: (() => void) | undefined;
    (async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        authUnsub = onAuthStateChanged(getAuth(), (user) => {
          setUid(user?.uid ?? null);
          setDisplayName(user?.displayName ?? user?.email?.split('@')[0] ?? 'A partner');
        });
      } catch (e) {
        reportError('PremiumShareContext.auth', e);
      }
    })();
    return () => authUnsub?.();
  }, []);

  const shareWith = useCallback(async (grantee: { uid: string; name: string; email: string }) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      await setShare(uid, displayName, grantee);
    } catch {
      Alert.alert('Could not share', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uid, displayName]);

  const revokeShare = useCallback(async () => {
    if (!uid) return;
    setIsLoading(true);
    try {
      await removeShare(uid);
    } catch {
      Alert.alert('Could not revoke', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  return (
    <PremiumShareContext.Provider
      value={{
        outgoingShare,
        incomingShare,
        isSharedWithMe: Boolean(incomingShare),
        shareWith,
        revokeShare,
        isLoading,
      }}
    >
      {children}
    </PremiumShareContext.Provider>
  );
}
