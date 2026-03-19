import { EVENT_COLORS } from '../ui/theme/tokens';
import type { FirestoreConnection } from './InvitationService';

export interface Connection {
  id: string;   // partner's Firebase UID (real) or demo ID (fallback)
  name: string;
  email: string;
  color: string;
  status: 'active' | 'pending';
}

// ─── Demo data (used when Firebase is not configured) ─────────────────────────

const DEMO_CONNECTIONS: Connection[] = [
  { id: 'u1', name: 'Jordan', email: 'jordan@example.com', color: EVENT_COLORS[0], status: 'active' },
  { id: 'u2', name: 'Sam',    email: 'sam@example.com',    color: EVENT_COLORS[2], status: 'active' },
  { id: 'u3', name: 'Riley',  email: 'riley@example.com',  color: EVENT_COLORS[4], status: 'pending' },
];

const AVATAR_COLORS = [EVENT_COLORS[0], EVENT_COLORS[2], EVENT_COLORS[4], EVENT_COLORS[1], EVENT_COLORS[3]];

function avatarColor(seed: string): string {
  return AVATAR_COLORS[seed.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── Live connections (populated from Firestore via useInvitations) ───────────

let _liveConnections: Connection[] | null = null;

/**
 * Called by useInvitations whenever the Firestore connection list changes.
 * Converts FirestoreConnection records into the Connection shape where `id`
 * is the partner's Firebase UID — the value stored in event.sharedWith.
 */
export function setLiveConnections(myUid: string, conns: FirestoreConnection[]): void {
  _liveConnections = conns.map((c) => {
    const amSender = c.fromUid === myUid;
    const partnerUid = amSender ? c.toUid : c.fromUid;
    return {
      id: partnerUid,
      name: amSender ? c.toName : c.fromName,
      email: amSender ? c.toEmail : c.fromEmail,
      color: avatarColor(c.id),
      status: 'active' as const,
    };
  });
}

/** Called by useInvitations when the user signs out. */
export function clearLiveConnections(): void {
  _liveConnections = null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getConnections(): Connection[] {
  return _liveConnections ?? DEMO_CONNECTIONS;
}

/** Look up a connection by the partner's Firebase UID (used by EventDetailsScreen). */
export function getConnectionByUid(uid: string): Connection | undefined {
  if (_liveConnections) return _liveConnections.find((c) => c.id === uid);
  return DEMO_CONNECTIONS.find((c) => c.id === uid);
}

/** @deprecated Use getConnectionByUid when looking up by Firebase UID. */
export function getConnectionById(id: string): Connection | undefined {
  return getConnectionByUid(id);
}

export function getActiveConnections(): Connection[] {
  return getConnections().filter((c) => c.status === 'active');
}
