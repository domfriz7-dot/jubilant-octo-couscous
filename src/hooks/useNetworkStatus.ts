import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  recheck: () => void;
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true);

  const update = useCallback((state: NetInfoState) => {
    setIsConnected(state.isConnected ?? true);
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(update);
    // Get the current state immediately
    NetInfo.fetch().then(update);
    return unsub;
  }, [update]);

  const recheck = useCallback(() => {
    NetInfo.fetch().then(update);
  }, [update]);

  return { isConnected, recheck };
}
