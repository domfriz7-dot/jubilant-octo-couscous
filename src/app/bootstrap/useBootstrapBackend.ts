import { useEffect } from 'react';
import { reportError } from '../../utils/reportError';

export default function useBootstrapBackend(): void {
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) return;
    (async () => {
      try {
        const { initializeApp, getApps } = await import('firebase/app');
        if (getApps().length > 0) return; // already initialised
        initializeApp({
          apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
          storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
          messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
          appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
        });
      } catch (e) {
        reportError('useBootstrapBackend', e);
      }
    })();
  }, []);
}
