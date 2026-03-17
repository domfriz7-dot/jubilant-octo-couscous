/**
 * useNetworkStatus — lightweight connectivity awareness.
 *
 * Uses the fetch API to ping a known endpoint rather than requiring
 * @react-native-community/netinfo (which needs native linking).
 *
 * Returns { isConnected, isChecking } — updates on app foreground.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { reportError } from '../utils/reportError';

const PING_URL = 'https://clients3.google.com/generate_204';
const PING_TIMEOUT_MS = 5000;

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(PING_URL, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    return res.ok || res.status === 204;
  } catch (e) {
    reportError('Hook.Network', e);
    return false;
  }
}

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true); // optimistic
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(true);
  const inFlightRef = useRef(false);

  const check = useCallback(async () => {
    if (inFlightRef.current) return connectedRef.current;

    inFlightRef.current = true;
    setIsChecking(true);
    try {
      const connected = await checkConnectivity();
      connectedRef.current = connected;
      setIsConnected(connected);
      setLastCheckedAt(Date.now());
      return connected;
    } catch { /* non-fatal */ } finally {
      inFlightRef.current = false;
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });

    intervalRef.current = setInterval(() => {
      if (!connectedRef.current) void check();
    }, 30000);

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check]);

  return { isConnected, isChecking, lastCheckedAt, recheck: check };
}
