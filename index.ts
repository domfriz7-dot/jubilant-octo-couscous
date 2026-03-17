import { useCallback, useEffect, useState } from 'react';
import InviteService from '../services/InviteService';
import ConnectionsService from '../services/ConnectionsService';
import { logError } from '../services/logger';
import type { Connection } from '../types/connections';

type SentInvite = Awaited<ReturnType<typeof InviteService.getSentInvites>>[number];
type InviteLookupResult = Awaited<ReturnType<typeof InviteService.lookupInvite>>;

/**
 * Reactive hook for the invite system.
 * Drives both the "invite someone" and "accept a code" flows.
 *
 * @param {{ prefillCode?: string }} opts
 */
export type UseInvitesOptions = { prefillCode?: string };

export function useInvites({ prefillCode }: UseInvitesOptions = {}) {
  const [myCode, setMyCode] = useState('');
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  // Accept form state
  const [acceptCode, setAcceptCode] = useState(prefillCode || '');
  const [acceptName, setAcceptName] = useState('');
  const [acceptRelationship, setAcceptRelationship] = useState('partner');
  const [lookupResult, setLookupResult] = useState<InviteLookupResult>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // ── Load data ───────────────────────────────────────────
  const reload = useCallback(async () => {
    try {
      const [code, invites, conns] = await Promise.all([
        InviteService.getMyCode(),
        InviteService.getSentInvites(),
        ConnectionsService.getConnections(),
      ]);
      setMyCode(code);
      setSentInvites(invites);
      setConnections(Array.isArray(conns) ? conns : []);
    } catch (e) {
      logError('useInvites:reload', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const unsub1 = InviteService.subscribe(reload);
    const unsub2 = ConnectionsService.subscribe(reload);
    return () => { unsub1(); unsub2(); };
  }, [reload]);

  // Prefill
  useEffect(() => {
    if (prefillCode) setAcceptCode(String(prefillCode));
  }, [prefillCode]);

  // ── Create invite ───────────────────────────────────────
  const createInvite = useCallback(async ({ toEmail, toName, relationship }: { toEmail?: string; toName?: string; relationship?: string } = {}) => {
    const invite = await InviteService.createInvite({ toEmail, toName, relationship });
    await reload();
    return invite;
  }, [reload]);

  // ── Lookup (show who sent it before accepting) ──────────
  const lookupCode = useCallback(async (code: string) => {
    const normalized = String(code || '').trim();
    if (normalized.length < 4) {
      setLookupResult(null);
      return null;
    }
    setLookupLoading(true);
    try {
      const result = await InviteService.lookupInvite(normalized);
      setLookupResult(result);
      return result;
    } catch (e) {
      logError('useInvites:lookup', e);
      setLookupResult(null);
      return null;
    } finally {
      setLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    const normalized = String(acceptCode || '').trim();
    if (normalized.length < 4) {
      setLookupResult(null);
      return;
    }
    const timer = setTimeout(() => { lookupCode(normalized); }, 180);
    return () => clearTimeout(timer);
  }, [acceptCode, lookupCode]);

  // ── Accept invite ───────────────────────────────────────
  const acceptInvite = useCallback(async () => {
    const code = String(acceptCode || '').trim();
    if (code.length < 4) throw new Error('Please enter a valid invite code');

    const { connection } = await InviteService.acceptInvite(code, {
      name: acceptName.trim() || 'Connected User',
      relationship: acceptRelationship,
    });

    // Reset form
    setAcceptCode('');
    setAcceptName('');
    setLookupResult(null);
    await reload();

    return connection;
  }, [acceptCode, acceptName, acceptRelationship, reload]);

  // ── Revoke / Resend ─────────────────────────────────────
  const revokeInvite = useCallback(async (inviteId: string) => {
    await InviteService.revokeInvite(inviteId);
    await reload();
  }, [reload]);

  const resendInvite = useCallback(async (inviteId: string) => {
    const invite = await InviteService.resendInvite(inviteId);
    await reload();
    return invite;
  }, [reload]);

  // ── Regenerate code ─────────────────────────────────────
  const regenerateCode = useCallback(async () => {
    const code = await InviteService.regenerateMyCode();
    setMyCode(code);
    return code;
  }, []);

  // ── Remove connection ───────────────────────────────────
  const removeConnection = useCallback(async (connectionId: string) => {
    await ConnectionsService.removeConnection(connectionId);
    await reload();
  }, [reload]);

  // ── Derived state ───────────────────────────────────────
  const pendingInvites = sentInvites.filter(i => i.status === 'pending');
  const acceptedInvites = sentInvites.filter(i => i.status === 'accepted');
  const isAcceptValid = String(acceptCode || '').trim().length >= 4;

  return {
    // My code
    myCode,
    regenerateCode,

    // Sent invites
    sentInvites,
    pendingInvites,
    acceptedInvites,
    createInvite,
    revokeInvite,
    resendInvite,

    // Accept flow
    acceptCode,
    setAcceptCode,
    acceptName,
    setAcceptName,
    acceptRelationship,
    setAcceptRelationship,
    isAcceptValid,
    lookupResult,
    lookupLoading,
    lookupCode,
    acceptInvite,

    // Connections
    connections,
    removeConnection,

    // State
    loading,
    reload,
  };
}
