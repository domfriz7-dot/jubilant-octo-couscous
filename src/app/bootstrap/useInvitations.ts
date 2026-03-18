/**
 * useInvitations
 *
 * Central hook for all connections/invitation state.
 * When Firebase is configured and the user is authenticated it sets up
 * real-time Firestore listeners. Otherwise it returns demo data so the
 * UI is still populated during development without credentials.
 */

import { useState, useEffect, useRef } from 'react';
import {
  FirestoreConnection,
  FirestoreInvitation,
  subscribeToConnections,
  subscribeToIncomingInvitations,
  subscribeToOutgoingInvitations,
} from '../../services/InvitationService';
import { getConnections } from '../../services/ConnectionsService';
import CalendarService from '../../services/CalendarService';
import { EVENT_COLORS } from '../../ui/theme/tokens';
import { reportError } from '../../utils/reportError';

// ─── Shaped types ─────────────────────────────────────────────────────────────

export interface DisplayConnection {
  id: string;
  name: string;
  email: string;
  color: string;
  status: 'active';
}

export interface InvitationsState {
  firebaseEnabled: boolean;
  authenticated: boolean;
  connections: DisplayConnection[];
  incomingInvitations: FirestoreInvitation[];
  outgoingInvitations: FirestoreInvitation[];
  loading: boolean;
  uid: string | null;
  email: string | null;
  displayName: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [EVENT_COLORS[0], EVENT_COLORS[2], EVENT_COLORS[4], EVENT_COLORS[1], EVENT_COLORS[3]];

function connectionColor(id: string): string {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

function toDisplayConnection(conn: FirestoreConnection, myUid: string): DisplayConnection {
  const amSender = conn.fromUid === myUid;
  return {
    id: conn.id,
    name: amSender ? conn.toName : conn.fromName,
    email: amSender ? conn.toEmail : conn.fromEmail,
    color: connectionColor(conn.id),
    status: 'active',
  };
}

function demoConnections(): DisplayConnection[] {
  return getConnections().map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    color: c.color,
    status: 'active' as const,
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export default function useInvitations(): InvitationsState {
  const firebaseEnabled = Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);

  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [connections, setConnections] = useState<DisplayConnection[]>([]);
  const [incomingInvitations, setIncomingInvitations] = useState<FirestoreInvitation[]>([]);
  const [outgoingInvitations, setOutgoingInvitations] = useState<FirestoreInvitation[]>([]);

  const unsubsRef = useRef<Array<() => void>>([]);
  const unsubAll = () => {
    unsubsRef.current.forEach((fn) => fn());
    unsubsRef.current = [];
  };

  useEffect(() => {
    if (!firebaseEnabled) {
      setConnections(demoConnections());
      setLoading(false);
      return;
    }

    let authUnsub: (() => void) | undefined;

    (async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        const auth = getAuth();

        authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
          // Tear down previous listeners whenever the user changes
          unsubAll();

          if (!firebaseUser) {
            setUid(null);
            setEmail(null);
            setDisplayName(null);
            setConnections([]);
            setIncomingInvitations([]);
            setOutgoingInvitations([]);
            setLoading(false);
            return;
          }

          const currentUid = firebaseUser.uid;
          const currentEmail = firebaseUser.email ?? '';
          setUid(currentUid);
          setEmail(currentEmail);
          setDisplayName(firebaseUser.displayName);
          setLoading(true);

          // Each stream fires its first snapshot independently. Track per-stream
          // readiness with boolean flags so repeated snapshots on one stream
          // cannot prematurely clear the loading state before others resolve.
          let connReady = false;
          let incReady = false;
          let outReady = false;
          const checkAllReady = () => {
            if (connReady && incReady && outReady) setLoading(false);
          };

          const u1 = subscribeToConnections(currentUid, (conns) => {
            setConnections(conns.map((c) => toDisplayConnection(c, currentUid)));
            connReady = true;
            checkAllReady();
          });

          const u2 = subscribeToIncomingInvitations(currentUid, currentEmail, (invs) => {
            setIncomingInvitations(invs);
            incReady = true;
            checkAllReady();
          });

          const u3 = subscribeToOutgoingInvitations(currentUid, (invs) => {
            setOutgoingInvitations(invs);
            outReady = true;
            checkAllReady();
          });

          const u4 = CalendarService.subscribeToSharedEvents(currentUid);

          unsubsRef.current = [u1, u2, u3, u4];
        });
      } catch (e) {
        reportError('useInvitations.init', e);
        setConnections(demoConnections());
        setLoading(false);
      }
    })();

    return () => {
      authUnsub?.();
      unsubAll();
    };
    // firebaseEnabled is constant for the app's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    firebaseEnabled,
    authenticated: Boolean(uid),
    connections,
    incomingInvitations,
    outgoingInvitations,
    loading,
    uid,
    email,
    displayName,
  };
}
