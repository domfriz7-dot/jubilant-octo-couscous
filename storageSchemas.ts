import { optionalEnv } from './env';

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type Extra = {
  firebase?: Partial<FirebaseConfig>;
};

function readExtra(): Extra {
  try {
    // Avoid hard dependency: expo-constants might not be installed in some environments.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants')?.default ?? require('expo-constants');
    const extra = (Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {}) as Extra;
    return extra;
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[firebase] failed to read extra config', e);
    }
    return {};
  }
}

export function getFirebaseConfig(): FirebaseConfig | null {
  const extra = readExtra();
  const cfg = extra.firebase ?? {};

  // Read from runtime config or env vars — no hardcoded secrets.
  const apiKey = String(cfg.apiKey ?? '').trim() || optionalEnv('EXPO_PUBLIC_FIREBASE_API_KEY');
  const projectId = String(cfg.projectId ?? '').trim() || optionalEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID');

  // Treat firebase as "disabled" unless minimally configured.
  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    authDomain: String(cfg.authDomain ?? '').trim() || optionalEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: String(cfg.storageBucket ?? '').trim() || optionalEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') || `${projectId}.appspot.com`,
    messagingSenderId: String(cfg.messagingSenderId ?? '').trim() || optionalEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: String(cfg.appId ?? '').trim() || optionalEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  };
}

export function isFirebaseEnabled(): boolean {
  return getFirebaseConfig() !== null;
}
