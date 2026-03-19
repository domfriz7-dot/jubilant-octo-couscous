/**
 * PremiumShareService
 *
 * Manages premium benefit sharing between connected users.
 * A purchaser (grantor) can share their U&Me Plus subscription with exactly
 * one connected partner (grantee) at a time.
 *
 * Firestore schema
 * ────────────────
 * /premiumShares/{grantorUid}
 *   grantorUid:   string
 *   granteeUid:   string
 *   granteeName:  string
 *   granteeEmail: string
 *   sharedAt:     string (ISO-8601)
 */

import { reportError } from '../utils/reportError';

const COLLECTION = 'premiumShares';

export interface PremiumShareRecord {
  grantorUid: string;
  grantorName: string;
  granteeUid: string;
  granteeName: string;
  granteeEmail: string;
  sharedAt: string;
}

function isFirebaseConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
}

/**
 * Write (or overwrite) a share record. Keyed by the grantor's UID so a
 * purchaser can only share with one person at a time.
 */
export async function setShare(
  grantorUid: string,
  grantorName: string,
  grantee: { uid: string; name: string; email: string }
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const db = getFirestore();
    const record: PremiumShareRecord = {
      grantorUid,
      grantorName,
      granteeUid: grantee.uid,
      granteeName: grantee.name,
      granteeEmail: grantee.email,
      sharedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, COLLECTION, grantorUid), record);
  } catch (e) {
    reportError('PremiumShareService.setShare', e);
    throw e;
  }
}

/**
 * Remove a share record (revoke access for the current grantee).
 */
export async function removeShare(grantorUid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(getFirestore(), COLLECTION, grantorUid));
  } catch (e) {
    reportError('PremiumShareService.removeShare', e);
    throw e;
  }
}

/**
 * Real-time listener for the share record the current user has granted.
 * Fires immediately with the current state, then on every change.
 */
export function subscribeToOutgoingShare(
  grantorUid: string,
  cb: (record: PremiumShareRecord | null) => void
): () => void {
  if (!isFirebaseConfigured()) {
    cb(null);
    return () => {};
  }
  let unsub = () => {};
  (async () => {
    try {
      const { getFirestore, doc, onSnapshot } = await import('firebase/firestore');
      unsub = onSnapshot(doc(getFirestore(), COLLECTION, grantorUid), (snap) => {
        cb(snap.exists() ? (snap.data() as PremiumShareRecord) : null);
      });
    } catch (e) {
      reportError('PremiumShareService.subscribeToOutgoingShare', e);
      cb(null);
    }
  })();
  return () => unsub();
}

/**
 * Real-time listener for an incoming share (i.e. someone shared Plus with me).
 * Uses a query on granteeUid so the grantee can discover who shared with them.
 */
export function subscribeToIncomingShare(
  granteeUid: string,
  cb: (record: PremiumShareRecord | null) => void
): () => void {
  if (!isFirebaseConfigured()) {
    cb(null);
    return () => {};
  }
  let unsub = () => {};
  (async () => {
    try {
      const { getFirestore, collection, query, where, limit, onSnapshot } = await import('firebase/firestore');
      const q = query(
        collection(getFirestore(), COLLECTION),
        where('granteeUid', '==', granteeUid),
        limit(1)
      );
      unsub = onSnapshot(q, (snap) => {
        cb(snap.empty ? null : (snap.docs[0].data() as PremiumShareRecord));
      });
    } catch (e) {
      reportError('PremiumShareService.subscribeToIncomingShare', e);
      cb(null);
    }
  })();
  return () => unsub();
}
