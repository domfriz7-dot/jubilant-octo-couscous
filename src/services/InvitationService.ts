/**
 * InvitationService
 *
 * Manages connection invitations and accepted connections via Firestore.
 * Falls back to local demo data gracefully when Firebase is not configured.
 *
 * Firestore schema
 * ────────────────
 * /users/{uid}
 *   email: string
 *   displayName: string
 *   fcmToken: string | null
 *   createdAt: string (ISO-8601)
 *
 * /invitations/{invitationId}
 *   fromUid:      string
 *   fromEmail:    string
 *   fromName:     string
 *   toEmail:      string
 *   toUid:        string | null   (null if recipient not yet registered)
 *   status:       'pending' | 'accepted' | 'declined'
 *   createdAt:    string (ISO-8601)
 *   updatedAt:    string (ISO-8601)
 *
 * /connections/{connectionId}
 *   fromUid:   string
 *   toUid:     string
 *   fromEmail: string
 *   toEmail:   string
 *   fromName:  string
 *   toName:    string
 *   status:    'active'
 *   createdAt: string (ISO-8601)
 */

import { reportError } from '../utils/reportError';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FirestoreInvitation {
  id: string;
  fromUid: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toUid: string | null;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreConnection {
  id: string;
  fromUid: string;
  toUid: string;
  fromEmail: string;
  toEmail: string;
  fromName: string;
  toName: string;
  status: 'active';
  createdAt: string;
}

type UnsubscribeFn = () => void;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function isFirebaseConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
}

// ─── User profile ─────────────────────────────────────────────────────────────

/**
 * Create or update the /users/{uid} document with latest profile info.
 * Called whenever auth state resolves to a logged-in user.
 */
export async function ensureUserProfile(
  uid: string,
  email: string | null,
  displayName: string | null,
  fcmToken?: string | null
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const db = getFirestore();
    await setDoc(
      doc(db, 'users', uid),
      {
        email: email ?? '',
        displayName: displayName ?? '',
        ...(fcmToken !== undefined ? { fcmToken: fcmToken ?? null } : {}),
        updatedAt: now(),
      },
      { merge: true }
    );
  } catch (e) {
    reportError('InvitationService.ensureUserProfile', e);
  }
}

// ─── Invitations ──────────────────────────────────────────────────────────────

/**
 * Send an invitation to toEmail from the current user.
 * Calls the findUserByEmail Cloud Function to resolve toUid if possible.
 * Returns an error string on failure, or null on success.
 */
export async function sendInvitation(
  fromUid: string,
  fromEmail: string,
  fromName: string,
  toEmail: string
): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    return 'Firebase is not configured. Invite could not be sent.';
  }
  try {
    const {
      getFirestore,
      collection,
      addDoc,
      query,
      where,
      getDocs,
    } = await import('firebase/firestore');

    const db = getFirestore();
    const invCol = collection(db, 'invitations');

    // Guard: cannot invite yourself
    if (toEmail.toLowerCase() === fromEmail.toLowerCase()) {
      return 'You cannot invite yourself.';
    }

    // Guard: check for an existing pending/accepted invite between these parties
    const existingQ = query(
      invCol,
      where('fromUid', '==', fromUid),
      where('toEmail', '==', toEmail.toLowerCase()),
      where('status', 'in', ['pending', 'accepted'])
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      if (existing.status === 'accepted') return 'You are already connected with this person.';
      return 'An invite is already pending for this email.';
    }

    // Resolve toUid by calling the findUserByEmail Cloud Function
    let toUid: string | null = null;
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const findUser = httpsCallable<{ email: string }, { found: boolean; uid?: string }>(
        functions,
        'findUserByEmail'
      );
      const result = await findUser({ email: toEmail.toLowerCase() });
      if (result.data.found && result.data.uid) {
        toUid = result.data.uid;
      }
    } catch (fnError) {
      // Non-fatal: proceed with toUid = null; invite can still be matched on registration
      reportError('InvitationService.findUserByEmail', fnError);
    }

    await addDoc(invCol, {
      fromUid,
      fromEmail: fromEmail.toLowerCase(),
      fromName: fromName || fromEmail,
      toEmail: toEmail.toLowerCase(),
      toUid,
      status: 'pending',
      createdAt: now(),
      updatedAt: now(),
    });

    return null; // success
  } catch (e) {
    reportError('InvitationService.sendInvitation', e);
    return 'Could not send invite. Please try again.';
  }
}

/**
 * Accept a pending invitation atomically.
 * Uses a Firestore transaction to prevent duplicate connections if two devices
 * attempt to accept the same invite simultaneously.
 */
export async function acceptInvitation(
  invitationId: string,
  invitation: FirestoreInvitation,
  acceptorUid: string,
  acceptorName: string
): Promise<string | null> {
  if (!isFirebaseConfigured()) return 'Firebase is not configured.';
  try {
    const {
      getFirestore,
      doc,
      collection,
      runTransaction,
    } = await import('firebase/firestore');
    const db = getFirestore();
    const invRef = doc(db, 'invitations', invitationId);
    // Pre-allocate connection document reference (auto-ID)
    const connRef = doc(collection(db, 'connections'));

    await runTransaction(db, async (tx) => {
      const invSnap = await tx.get(invRef);
      if (!invSnap.exists()) throw new Error('Invitation not found.');
      if (invSnap.data()?.status !== 'pending') throw new Error('This invitation is no longer pending.');

      tx.update(invRef, {
        status: 'accepted',
        toUid: acceptorUid,
        updatedAt: now(),
      });

      tx.set(connRef, {
        fromUid: invitation.fromUid,
        toUid: acceptorUid,
        fromEmail: invitation.fromEmail,
        toEmail: invitation.toEmail,
        fromName: invitation.fromName,
        toName: acceptorName,
        status: 'active',
        createdAt: now(),
      });
    });

    return null; // success
  } catch (e: any) {
    reportError('InvitationService.acceptInvitation', e);
    const msg: string = e?.message ?? '';
    if (msg.includes('no longer pending') || msg.includes('not found')) return msg;
    return 'Could not accept invite. Please try again.';
  }
}

/**
 * Decline a pending invitation.
 */
export async function declineInvitation(invitationId: string): Promise<string | null> {
  if (!isFirebaseConfigured()) return 'Firebase is not configured.';
  try {
    const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(getFirestore(), 'invitations', invitationId), {
      status: 'declined',
      updatedAt: now(),
    });
    return null;
  } catch (e) {
    reportError('InvitationService.declineInvitation', e);
    return 'Could not decline invite. Please try again.';
  }
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

/**
 * Subscribe to accepted connections for uid (as sender or recipient).
 * Calls back immediately with current data and on every change.
 */
export function subscribeToConnections(
  uid: string,
  onData: (connections: FirestoreConnection[]) => void
): UnsubscribeFn {
  if (!isFirebaseConfigured()) return () => {};

  let alive = true;
  let unsub1: UnsubscribeFn = () => {};
  let unsub2: UnsubscribeFn = () => {};

  // Firestore doesn't support OR queries across different fields in a single
  // listener, so we use two queries and merge results client-side.
  let sentConnections: FirestoreConnection[] = [];
  let receivedConnections: FirestoreConnection[] = [];

  function merge() {
    const seen = new Set<string>();
    const merged: FirestoreConnection[] = [];
    for (const c of [...sentConnections, ...receivedConnections]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        merged.push(c);
      }
    }
    onData(merged);
  }

  (async () => {
    try {
      const {
        getFirestore,
        collection,
        query,
        where,
        onSnapshot,
      } = await import('firebase/firestore');
      if (!alive) return;
      const db = getFirestore();
      const col = collection(db, 'connections');

      unsub1 = onSnapshot(
        query(col, where('fromUid', '==', uid), where('status', '==', 'active')),
        (snap) => {
          sentConnections = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreConnection));
          merge();
        },
        (err) => reportError('InvitationService.subscribeConnections.from', err)
      );

      unsub2 = onSnapshot(
        query(col, where('toUid', '==', uid), where('status', '==', 'active')),
        (snap) => {
          receivedConnections = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreConnection));
          merge();
        },
        (err) => reportError('InvitationService.subscribeConnections.to', err)
      );
    } catch (e) {
      reportError('InvitationService.subscribeConnections.init', e);
    }
  })();

  return () => { alive = false; unsub1(); unsub2(); };
}

/**
 * Subscribe to incoming pending invitations (where toEmail or toUid matches the user).
 */
export function subscribeToIncomingInvitations(
  uid: string,
  email: string,
  onData: (invitations: FirestoreInvitation[]) => void
): UnsubscribeFn {
  if (!isFirebaseConfigured()) return () => {};

  let alive = true;
  let unsubByUid: UnsubscribeFn = () => {};
  let unsubByEmail: UnsubscribeFn = () => {};
  let byUid: FirestoreInvitation[] = [];
  let byEmail: FirestoreInvitation[] = [];

  function merge() {
    const seen = new Set<string>();
    const merged: FirestoreInvitation[] = [];
    for (const inv of [...byUid, ...byEmail]) {
      if (!seen.has(inv.id)) {
        seen.add(inv.id);
        merged.push(inv);
      }
    }
    onData(merged);
  }

  (async () => {
    try {
      const {
        getFirestore,
        collection,
        query,
        where,
        onSnapshot,
      } = await import('firebase/firestore');
      if (!alive) return;
      const db = getFirestore();
      const col = collection(db, 'invitations');

      // Invitations where the server already resolved our UID
      unsubByUid = onSnapshot(
        query(col, where('toUid', '==', uid), where('status', '==', 'pending')),
        (snap) => {
          byUid = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreInvitation));
          merge();
        },
        (err) => reportError('InvitationService.subscribeIncoming.uid', err)
      );

      // Invitations sent before we registered (matched by email only)
      unsubByEmail = onSnapshot(
        query(
          col,
          where('toEmail', '==', email.toLowerCase()),
          where('toUid', '==', null),
          where('status', '==', 'pending')
        ),
        (snap) => {
          byEmail = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreInvitation));
          merge();
        },
        (err) => reportError('InvitationService.subscribeIncoming.email', err)
      );
    } catch (e) {
      reportError('InvitationService.subscribeIncoming.init', e);
    }
  })();

  return () => { alive = false; unsubByUid(); unsubByEmail(); };
}

/**
 * Subscribe to outgoing pending invitations sent by uid.
 */
export function subscribeToOutgoingInvitations(
  uid: string,
  onData: (invitations: FirestoreInvitation[]) => void
): UnsubscribeFn {
  if (!isFirebaseConfigured()) return () => {};

  let alive = true;
  let unsub: UnsubscribeFn = () => {};

  (async () => {
    try {
      const {
        getFirestore,
        collection,
        query,
        where,
        onSnapshot,
        orderBy,
      } = await import('firebase/firestore');
      if (!alive) return;
      const db = getFirestore();
      unsub = onSnapshot(
        query(
          collection(db, 'invitations'),
          where('fromUid', '==', uid),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        ),
        (snap) => {
          onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreInvitation)));
        },
        (err) => reportError('InvitationService.subscribeOutgoing', err)
      );
    } catch (e) {
      reportError('InvitationService.subscribeOutgoing.init', e);
    }
  })();

  return () => { alive = false; unsub(); };
}
