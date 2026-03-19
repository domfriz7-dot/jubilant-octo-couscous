import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseConfig } from '../../config/firebase';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const cfg = getFirebaseConfig();
  if (!cfg) return null;
  if (app) return app;
  const existing = getApps();
  app = existing.length ? existing[0] : initializeApp(cfg);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!auth) {
    try {
      // Use AsyncStorage persistence so anonymous auth survives app restarts.
      // Falls back to in-memory if initializeAuth has already been called.
      auth = initializeAuth(a, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // initializeAuth throws if already initialized — fall back to getAuth.
      auth = getAuth(a);
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!db) {
    try {
      // experimentalForceLongPolling is required for the Firebase JS SDK on
      // React Native (no native WebChannel support).
      db = initializeFirestore(a, {
        experimentalForceLongPolling: true,
      });
    } catch {
      // Already initialized — fall back to getFirestore.
      db = getFirestore(a);
    }
  }
  return db;
}
