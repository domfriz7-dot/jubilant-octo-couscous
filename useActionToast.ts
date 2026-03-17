import { useCallback, useEffect, useMemo, useState } from 'react';
import ConnectionsService from '../services/ConnectionsService';
import type { AppUser } from '../types/connections';
import { reportError } from '../utils/reportError';

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);

  const load = useCallback(async () => {
    try { setUsers(await ConnectionsService.getAllUsers()); } catch (e) { reportError('Hook.Users', e); setUsers([]); }
  }, []);

  useEffect(() => {
    load();
    return ConnectionsService.subscribe(load);
  }, [load]);

  const self = useMemo(() => users.find((u) => u.relationship === 'self') || users[0] || null, [users]);
  const others = useMemo(() => users.filter((u) => u.relationship !== 'self'), [users]);

  return { users, self, others, reload: load };
}