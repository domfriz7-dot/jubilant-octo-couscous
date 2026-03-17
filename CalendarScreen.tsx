import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import InviteService from '../../../services/InviteService';
import ConnectionsService from '../../../services/ConnectionsService';
import { logError } from '../../../services/logger';

const USER_PROFILE_KEY = '@uandme_user_profile';

export function useShareCalendar({ prefillCode }: { prefillCode?: string } = {}) {
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [shareCode, setShareCode] = useState('');
  const [acceptCode, setAcceptCode] = useState(prefillCode ? String(prefillCode) : '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [connections, setConnections] = useState<any[]>([]);

  const reload = useCallback(async () => {
    try {
      const profileRaw = await AsyncStorage.getItem(USER_PROFILE_KEY);
      const profile = profileRaw ? JSON.parse(profileRaw) : null;
      setUserProfile(profile);

      // Use InviteService for the persistent, cross-device code
      const code = await InviteService.getMyCode();
      setShareCode(code);

      const list = await ConnectionsService.getConnections();
      setConnections(Array.isArray(list) ? list : []);
    } catch (e) {
      logError('ShareCalendar.reload', e);
    }
  }, []);

  useEffect(() => {
    reload();
    const unsub = ConnectionsService.subscribe(reload);
    return () => unsub();
  }, [reload]);

  useEffect(() => {
    if (prefillCode) setAcceptCode(String(prefillCode).toUpperCase());
  }, [prefillCode]);

  // Accept any code >= 4 chars (matches InviteService validation)
  const isAcceptValid = useMemo(
    () => String(acceptCode || '').trim().length >= 4,
    [acceptCode]
  );

  const accept = useCallback(async () => {
    const code = String(acceptCode || '').trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Invalid code', 'Please enter a valid invite code.');
      return null;
    }

    const profileRaw = await AsyncStorage.getItem(USER_PROFILE_KEY);
    const profile = profileRaw ? JSON.parse(profileRaw) : null;

    // acceptInvite handles both Firestore (cross-device) and local fallback
    const { connection } = await InviteService.acceptInvite(code, {
      name: profile?.name || 'Connected User',
      email: inviteEmail?.trim() || profile?.email || '',
      color: profile?.color || undefined,
    });

    // Persist the connection so the rest of the app sees it
    const existing = await ConnectionsService.getConnections();
    const alreadyExists = existing.some((c: { id: string }) => c.id === connection.id || c.linkedVia === code);
    if (!alreadyExists) {
      existing.unshift(connection);
      await ConnectionsService.saveConnections(existing);
    }

    setAcceptCode('');
    const list = await ConnectionsService.getConnections();
    setConnections(Array.isArray(list) ? list : []);
    return connection;
  }, [acceptCode, inviteEmail]);

  const remove = useCallback(async (id: string) => {
    await ConnectionsService.removeConnection(id);
    const list = await ConnectionsService.getConnections();
    setConnections(Array.isArray(list) ? list : []);
  }, []);

  return {
    userProfile,
    shareCode,
    acceptCode,
    setAcceptCode,
    inviteEmail,
    setInviteEmail,
    connections,
    isAcceptValid,
    accept,
    remove,
    reload,
  };
}
