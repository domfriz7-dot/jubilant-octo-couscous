import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const IDENTITY_KEY = '@uandme/identity';

interface Identity {
  userId: string;
  createdAt: string;
}

let _identity: Identity | null = null;

/** Initialise (or restore) a stable local identity for this device. */
export async function initIdentityResult(): Promise<Identity> {
  if (_identity) return _identity;

  const stored = await AsyncStorage.getItem(IDENTITY_KEY);
  if (stored) {
    _identity = JSON.parse(stored) as Identity;
    return _identity;
  }

  const userId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}`
  ).then((hash) => `local_${hash.slice(0, 16)}`);

  _identity = { userId, createdAt: new Date().toISOString() };
  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(_identity));
  return _identity;
}

export function getIdentity(): Identity | null {
  return _identity;
}

export function getUserId(): string {
  return _identity?.userId ?? 'anonymous';
}
