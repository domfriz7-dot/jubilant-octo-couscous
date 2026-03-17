import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { logError, logEvent } from './logger';
import { getCurrentUserId } from './IdentityService';
import ConnectionsService from './ConnectionsService';

/**
 * InviteService — Full invite lifecycle management.
 *
 * Local-first with clear backend swap points. Every method marked with
 * ⚡ BACKEND has a comment showing the REST/realtime equivalent.
 *
 * ─── INVITE LIFECYCLE ───────────────────────────────────────
 *
 *  1. GENERATE  → User gets a unique invite code/link
 *  2. SEND      → Code shared via SMS, email, share sheet, or QR
 *  3. ACCEPT    → Recipient enters code → both users linked
 *  4. CONFIRM   → Original sender sees "accepted" status
 *  5. EXPIRE    → Unused invites expire after TTL
 *
 * ─── BACKEND MIGRATION GUIDE ────────────────────────────────
 *
 *  generateInvite()  → POST   /api/invites          → { id, code, link, expiresAt }
 *  getMyInvites()    → GET    /api/invites/mine      → Invite[]
 *  acceptInvite()    → POST   /api/invites/accept    → { connection, invite }
 *  getInviteByCode() → GET    /api/invites/:code     → Invite | null
 *  revokeInvite()    → DELETE /api/invites/:id       → void
 *  refreshStatuses() → GET    /api/invites/mine      → (poll or websocket)
 *
 *  Real-time: Use Firestore onSnapshot / Supabase subscribe / WebSocket
 *  to push status changes instantly instead of polling.
 */

// ── Storage Keys ───────────────────────────────────────────
const INVITES_SENT_KEY = '@uandme_invites_sent_v2';
const INVITES_RECEIVED_KEY = '@uandme_invites_received_v2';
const MY_INVITE_CODE_KEY = '@uandme_my_invite_code_v2';
const USER_PROFILE_KEY = '@uandme_user_profile';

// ── Constants ──────────────────────────────────────────────
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CODE_LENGTH = 6;
const LINK_SCHEME = 'uandme';
const LINK_HOST = 'join';

/**
 * @typedef {'pending' | 'accepted' | 'expired' | 'revoked'} InviteStatus
 *
 * @typedef {Object} Invite
 * @property {string}       id          - Unique invite ID
 * @property {string}       code        - 6-digit human-readable code
 * @property {string}       link        - Deep link: uandme://join/<code>
 * @property {InviteStatus} status      - Current status
 * @property {string}       fromUserId  - Sender's user ID
 * @property {string}       fromName    - Sender's display name
 * @property {string|null}  toEmail     - Recipient email (if known)
 * @property {string|null}  toName      - Recipient name (filled on accept)
 * @property {string|null}  toUserId    - Recipient user ID (filled on accept)
 * @property {string|null}  relationship - Relationship type (filled on accept)
 * @property {number}       createdAt   - Timestamp ms
 * @property {number}       expiresAt   - Timestamp ms
 * @property {number|null}  acceptedAt  - Timestamp ms (when accepted)
 * @property {string|null}  connectionId - ID of resulting connection (after accept)
 */

type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
type Invite = {
  id: string;
  code: string;
  link: string;
  status: InviteStatus;
  fromUserId: string;
  fromName: string;
  toEmail: string | null;
  toName: string | null;
  toUserId: string | null;
  relationship: string | null;
  createdAt: number;
  expiresAt: number;
  acceptedAt: number | null;
  connectionId: string | null;
};

class InviteService {
  private _obs: { subscribe: (l: (d: unknown) => void) => () => void; notify: () => void };
  private _listeners: Array<() => void> = [];
  private _pollTimer: ReturnType<typeof setInterval> | null = null;
  private _appStateSub: { remove: () => void } | null = null;

  constructor() {
    this._listeners = [];
    this._pollTimer = null;
    this._appStateSub = null;
  }

  // ══════════════════════════════════════════════════════════
  // CODE GENERATION
  // ══════════════════════════════════════════════════════════

  /**
   * Generate a cryptographically-ish random 6-digit code.
   * Avoids ambiguous chars (0/O, 1/I/L).
   */
  generateCode(): string {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Build deep link from code.
   * @param {string} code
   * @returns {string}
   */
  buildLink(code: string): string {
    return `${LINK_SCHEME}://${LINK_HOST}/${code}`;
  }

  /**
   * Build share message text.
   * @param {string} code
   * @param {string} senderName
   * @returns {string}
   */
  buildShareMessage(code: string, senderName: string): string {
    return [
      `${senderName} wants to connect with you on U&Me 💛`,
      '',
      `Your invite code: ${code}`,
      '',
      `Open the app and enter the code, or tap:`,
      this.buildLink(code),
    ].join('\n');
  }

  // ══════════════════════════════════════════════════════════
  // MY PERSISTENT CODE (your "share code" that stays the same)
  // ══════════════════════════════════════════════════════════

  /**
   * Get or create the user's persistent personal invite code.
   * This stays the same across sessions so they can print it,
   * put it in a bio, etc.
   *
   * ⚡ BACKEND: GET /api/users/me/invite-code
   *
   * @returns {Promise<string>}
   */
  async getMyCode() {
    try {
      const stored = await AsyncStorage.getItem(MY_INVITE_CODE_KEY);
      let code = stored;
      if (!code) {
        code = this.generateCode();
        await AsyncStorage.setItem(MY_INVITE_CODE_KEY, code);
      }

      // Publish to Firestore so other devices can look it up
      this._publishCodeToFirestore(code).catch(() => {});

      return code;
    } catch (e) {
      logError('InviteService:getMyCode', e);
      return this.generateCode(); // fallback ephemeral
    }
  }

  private async _publishCodeToFirestore(code: string): Promise<void> {
    try {
      const profile = await this._getProfile();
      const name = profile?.name || 'Someone';
      const color = profile?.color || '#B09080';
      const { publishInviteCode } = require('./SharingService');
      await publishInviteCode(code, name, color);
    } catch {
      // no Firebase configured — silent
      // Intentionally ignored — non-critical failure
    }
  }

  /**
   * Regenerate personal code (user wants a new one).
   *
   * ⚡ BACKEND: POST /api/users/me/invite-code/regenerate
   *
   * @returns {Promise<string>}
   */
  async regenerateMyCode() {
    const code = this.generateCode();
    await AsyncStorage.setItem(MY_INVITE_CODE_KEY, code);
    logEvent('InviteCodeRegenerated', { code });
    this._notify();
    return code;
  }

  // ══════════════════════════════════════════════════════════
  // SEND INVITES
  // ══════════════════════════════════════════════════════════

  /**
   * Create a new invite and persist it.
   *
   * ⚡ BACKEND: POST /api/invites
   *   body: { toEmail, relationship }
   *   returns: { id, code, link, expiresAt }
   *
   * @param {{ toEmail?: string, toName?: string, relationship?: string }} opts
   * @returns {Promise<Invite>}
   */
  async createInvite({ toEmail, toName, relationship }: { toEmail?: string; toName?: string; relationship?: string } = {}) {
    const profile = await this._getProfile();
    const code = this.generateCode();
    const now = Date.now();

    /** @type {Invite} */
    const invite = {
      id: `inv_${now}_${Math.random().toString(36).slice(2, 6)}`,
      code,
      link: this.buildLink(code),
      status: 'pending',
      fromUserId: profile?.id || getCurrentUserId(),
      fromName: profile?.name || 'You',
      toEmail: toEmail ? toEmail.trim().toLowerCase() : null,
      toName: toName || null,
      toUserId: null,
      relationship: relationship || null,
      createdAt: now,
      expiresAt: now + INVITE_TTL_MS,
      acceptedAt: null,
      connectionId: null,
    };

    const invites = await this._getSentInvites();
    invites.unshift(invite);
    await this._saveSentInvites(invites);

    logEvent('InviteCreated', { code, toEmail: invite.toEmail });
    this._notify();
    return invite;
  }

  /**
   * Get all invites I've sent, with statuses auto-updated.
   *
   * ⚡ BACKEND: GET /api/invites/sent
   *
   * @returns {Promise<Invite[]>}
   */
  async getSentInvites() {
    const invites = await this._getSentInvites();
    const now = Date.now();
    let changed = false;

    // Auto-expire old invites
    for (const inv of invites) {
      if (inv.status === 'pending' && inv.expiresAt < now) {
        inv.status = 'expired';
        changed = true;
      }
    }

    if (changed) await this._saveSentInvites(invites);
    return invites;
  }

  /**
   * Get pending (active) invites only.
   * @returns {Promise<Invite[]>}
   */
  async getPendingInvites() {
    const all = await this.getSentInvites();
    return all.filter((i: Invite) => i.status === 'pending');
  }

  /**
   * Revoke/cancel a sent invite.
   *
   * ⚡ BACKEND: DELETE /api/invites/:id
   *
   * @param {string} inviteId
   */
  async revokeInvite(inviteId) {
    const invites = await this._getSentInvites();
    const inv = invites.find((i: Invite) => i.id === inviteId);
    if (inv && inv.status === 'pending') {
      inv.status = 'revoked';
      await this._saveSentInvites(invites);
      logEvent('InviteRevoked', { id: inviteId });
      this._notify();
    }
  }

  /**
   * Resend an invite (update timestamp, keep same code).
   *
   * ⚡ BACKEND: POST /api/invites/:id/resend
   *
   * @param {string} inviteId
   * @returns {Promise<Invite|null>}
   */
  async resendInvite(inviteId) {
    const invites = await this._getSentInvites();
    const inv = invites.find((i: Invite) => i.id === inviteId);
    if (!inv) return null;

    const now = Date.now();
    inv.status = 'pending';
    inv.expiresAt = now + INVITE_TTL_MS;
    await this._saveSentInvites(invites);
    logEvent('InviteResent', { id: inviteId, code: inv.code });
    this._notify();
    return inv;
  }

  // ══════════════════════════════════════════════════════════
  // ACCEPT INVITES (receiver side)
  // ══════════════════════════════════════════════════════════

  /**
   * Look up an invite by code (to show info before accepting).
   *
   * ⚡ BACKEND: GET /api/invites/lookup?code=:code
   *   returns: { fromName, relationship, createdAt } (limited info)
   *
   * @param {string} code
   * @returns {Promise<Invite|null>}
   */
  async lookupInvite(code: string) {
    const normalized = this._normalizeCode(code);
    if (!normalized) return null;

    // 1. First try Firestore — this works across devices and platforms
    try {
      const { lookupInviteCode } = require('./SharingService');
      const remote = await lookupInviteCode(normalized);
      if (remote) {
        return {
          code: normalized,
          fromName: remote.fromName,
          fromColor: remote.fromColor,
          fromUid: remote.fromUid,
          status: remote.status,
          expiresAt: remote.expiresAt,
          source: 'remote',
        };
      }
    } catch {
      // SharingService unavailable (no Firebase config) — fall through to local
      // Intentionally ignored — non-critical failure
    }

    // 2. Fallback: check our own sent invites (for local dev / offline)
    const sent = await this._getSentInvites();
    const match = sent.find(
      (i: Invite) => i.code === normalized && i.status === 'pending' && i.expiresAt > Date.now()
    );

    if (match) {
      return {
        id: match.id,
        code: match.code,
        fromName: match.fromName,
        fromColor: null,
        fromUid: null,
        relationship: match.relationship,
        createdAt: match.createdAt,
        expiresAt: match.expiresAt,
        status: match.status,
        source: 'local',
      };
    }

    return null;
  }

  /**
   * Accept an invite code and create the bidirectional connection.
   *
   * ⚡ BACKEND: POST /api/invites/accept
   *   body: { code, acceptorName, acceptorEmail, relationship }
   *   returns: { connection, invite }
   *
   *   The backend would:
   *   1. Validate the code exists and is pending
   *   2. Create Connection records for BOTH users
   *   3. Mark invite as accepted
   *   4. Send push notification to sender
   *   5. Return the new connection
   *
   * @param {string} code
   * @param {{ name?: string, email?: string, color?: string, relationship?: string }} acceptorInfo
   * @returns {Promise<{ connection: Object, invite: Invite }>}
   */
  async acceptInvite(code: string, acceptorInfo: { name?: string; email?: string; color?: string; relationship?: string } = {}) {
    const normalized = this._normalizeCode(code);
    if (!normalized) throw new Error('Invalid invite code');

    const profile = await this._getProfile();
    const now = Date.now();
    const myName = acceptorInfo.name || profile?.name || 'You';
    const myColor = acceptorInfo.color || undefined;

    // ── Try Firestore accept first (cross-platform) ──────────
    let remoteResult: { fromUid: string; fromName: string; fromColor: string } | null = null;
    try {
      const { acceptInviteCode } = require('./SharingService');
      remoteResult = await acceptInviteCode(normalized, myName, myColor || '#B09080');
    } catch {
      // No Firebase — fall through to local-only mode
      // Intentionally ignored — non-critical failure
    }

    // ── Find and validate local invite (if it exists) ────────
    const sent = await this._getSentInvites();
    const invite = sent.find(
      (i: Invite) => i.code === normalized && i.status === 'pending'
    );

    // ── Build the connection object ──────────────────────────
    const connection = {
      id: remoteResult?.fromUid || `conn_${now}_${Math.random().toString(36).slice(2, 6)}`,
      name: remoteResult?.fromName || invite?.fromName || acceptorInfo.name || 'Connected User',
      email: acceptorInfo.email || '',
      color: remoteResult?.fromColor || acceptorInfo.color || undefined,
      relationship: acceptorInfo.relationship || invite?.relationship || 'friend',
      linkedVia: normalized,
      inviteId: invite?.id || null,
      remoteUid: remoteResult?.fromUid || null,
      pairedAt: now,
      createdAt: now,
    };

    // ── Update local invite status if we found it ─────────────
    if (invite) {
      invite.status = 'accepted';
      invite.acceptedAt = now;
      invite.toUserId = profile?.id || getCurrentUserId();
      invite.toName = myName;
      invite.connectionId = connection.id;
      await this._saveSentInvites(sent);
    }

    await ConnectionsService.upsertConnection({
      ...connection,
      status: 'connected',
    });

    // ── Record on receiver side ───────────────────────────────
    const received = await this._getReceivedInvites();
    received.unshift({
      code: normalized,
      fromName: connection.name,
      fromUid: remoteResult?.fromUid || null,
      connectionId: connection.id,
      acceptedAt: now,
    });
    await this._saveReceivedInvites(received);

    // ── Publish my invite code so they can find ME too ────────
    try {
      const myCode = await this.getMyCode();
      const { publishInviteCode } = require('./SharingService');
      await publishInviteCode(myCode, myName, myColor || '#B09080');
    } catch {
      // non-fatal
      // Intentionally ignored — non-critical failure
    }

    logEvent('InviteAccepted', { code: normalized, connectionId: connection.id, remote: !!remoteResult });
    this._notify();

    return { connection, invite: invite || { code: normalized, status: 'accepted' } };
  }

  // ══════════════════════════════════════════════════════════
  // POLLING / REFRESH (until backend pushes)
  // ══════════════════════════════════════════════════════════

  /**
   * Start polling for invite status changes.
   * Replace with WebSocket/push when backend is ready.
   *
   * ⚡ BACKEND: Replace with real-time listener
   *   e.g. supabase.from('invites').on('UPDATE', ...).subscribe()
   *
   * @param {number} intervalMs
   */
  startPolling(intervalMs = 30_000) {
    this.stopPolling();
    this._pollTimer = setInterval(async () => {
      try {
        // In backend mode, this would hit GET /api/invites/sent
        // and compare with local state to detect changes
        await this.getSentInvites(); // auto-expires
        this._notify();
      } catch (e) {
        logError('InviteService:poll', e);
      }
    }, intervalMs);

    // Safety: stop polling when app backgrounds (prevents leaks if callers forget to stop).
    try {
      if (!this._appStateSub) {
        this._appStateSub = AppState.addEventListener('change', (state) => {
          if (state === 'background' || state === 'inactive') {
            this.stopPolling();
          }
        });
      }
    } catch {
      // ignore
      // Intentionally ignored — non-critical failure
    }
  }

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }

    try {
      if (this._appStateSub?.remove) this._appStateSub.remove();
      this._appStateSub = null;
    } catch {
      // ignore
      // Intentionally ignored — non-critical failure
    }
  }

  // ══════════════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ══════════════════════════════════════════════════════════

  /**
   * Subscribe to invite state changes.
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  subscribe(listener: () => void) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l: () => void) => l !== listener);
    };
  }

  // ══════════════════════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════════════════════

  /**
   * Clean up all invite data (for account reset).
   */
  async clearAll() {
    await AsyncStorage.multiRemove([INVITES_SENT_KEY, INVITES_RECEIVED_KEY, MY_INVITE_CODE_KEY]);
    this._notify();
  }

  /**
   * Get invite statistics.
   * @returns {Promise<{ total: number, pending: number, accepted: number, expired: number }>}
   */
  async getStats() {
    const invites = await this.getSentInvites();
    return {
      total: invites.length,
      pending: invites.filter((i: Invite) => i.status === 'pending').length,
      accepted: invites.filter((i: Invite) => i.status === 'accepted').length,
      expired: invites.filter((i: Invite) => i.status === 'expired').length,
    };
  }

  // ══════════════════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════════════════

  _normalizeCode(code) {
    return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
  }

  async _getProfile() {
    try {
      const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      logError('InviteService:profile', e);
      return null;
    }
  }

  async _getSentInvites() {
    try {
      const raw = await AsyncStorage.getItem(INVITES_SENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      logError('InviteService:getSent', e);
      return [];
    }
  }

  async _saveSentInvites(invites) {
    try {
      await AsyncStorage.setItem(INVITES_SENT_KEY, JSON.stringify(invites));
    } catch (e) {
      logError('InviteService:saveSent', e);
    }
  }

  async _getReceivedInvites() {
    try {
      const raw = await AsyncStorage.getItem(INVITES_RECEIVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      logError('InviteService:getReceived', e);
      return [];
    }
  }

  async _saveReceivedInvites(invites) {
    try {
      await AsyncStorage.setItem(INVITES_RECEIVED_KEY, JSON.stringify(invites));
    } catch (e) {
      logError('InviteService:saveReceived', e);
    }
  }

  _notify() {
    for (const fn of this._listeners) {
      try { fn(); } catch (e) { logError('InviteService:notify', e); }
    }
  }
}

export default new InviteService();
